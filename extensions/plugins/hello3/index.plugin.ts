import { Attachment } from '@/attachment/schemas/attachment.schema';
import { AttachmentService } from '@/attachment/services/attachment.service';
import { Block } from '@/chat/schemas/block.schema';
import { Context } from '@/chat/schemas/types/context';
import {
  FileType,
  OutgoingMessageFormat,
  StdOutgoingAttachmentEnvelope
} from '@/chat/schemas/types/message';
import { config } from '@/config';
import { LoggerService } from '@/logger/logger.service';
import { BaseBlockPlugin } from '@/plugins/base-block-plugin';
import { PluginService } from '@/plugins/plugins.service';
import { PluginBlockTemplate } from '@/plugins/types';
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import SETTINGS from './settings';

// Define constants for the OpenRouter API
const OPENROUTER_API_KEY = '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';
const YOUR_SITE_URL = 'http://your-site-url.com';
const YOUR_SITE_NAME = 'YourSiteName';

@Injectable()
export class Hello3Plugin extends BaseBlockPlugin<typeof SETTINGS> {
  template: PluginBlockTemplate = { name: 'communicate in sign language' };

  constructor(
    pluginService: PluginService,
    private logger: LoggerService,
    private attachmentService: AttachmentService,
  ) {
    super('hello3-plugin', pluginService);
  }

  getPath(): string {
    return __dirname;
  }

  /**
   * Process the user input, get a response from the Gemini API, generate a video, and return the video as an attachment.
   * @param _block The block of the conversation.
   * @param context The context of the conversation.
   * @param _convId The conversation ID.
   * @returns The envelope containing the video attachment.
   */
  async process(_block: Block, context: Context, _convId: string) {
    console.log('----------------------------------------------------');
    const userText = context.text;
  
    // Log the user text
    this.logger.log(`User text: ${userText}`);
  
    try {
      // Step 1: Get Gemini response
      this.logger.log(`Requesting Gemini response for user text: ${userText}`);
      const geminiResponse = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: "google/gemini-2.0-flash-exp:free",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userText
              }
            ]
          }
        ]
      }, {
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": `${YOUR_SITE_URL}`,
          "X-Title": `${YOUR_SITE_NAME}`,
          "Content-Type": "application/json"
        }
      });
  
      // Check if the Gemini response is valid
      if (geminiResponse.status !== 200) {
        this.logger.error(`Failed to process Gemini request: ${geminiResponse.statusText}`);
        throw new Error(`Failed to process Gemini request: ${geminiResponse.statusText}`);
      }

      if (!geminiResponse.data.choices || !geminiResponse.data.choices[0] || !geminiResponse.data.choices[0].message) {
        this.logger.error(`Invalid Gemini response format: ${JSON.stringify(geminiResponse.data)}`);
        throw new Error(`Invalid Gemini response format`);
      }

      // Extract the content from the Gemini response
      const geminiText = geminiResponse.data.choices[0].message.content;
      this.logger.log(`Received Gemini response: ${geminiText}`);
  
      // Step 2: Generate video from Gemini response
      this.logger.log(`Requesting video generation for Gemini response: ${geminiText}`);
      const videoResponse = await axios.post('http://flask_video_app:5002/generate-video', { message: geminiText });
  
      // Check if the video generation response is valid
      if (videoResponse.status !== 200) {
        this.logger.error(`Failed to generate video: ${videoResponse.statusText}`);
        throw new Error(`Failed to generate video: ${videoResponse.statusText}`);
      }
      const videoId = videoResponse.data.videoId;
      this.logger.log(`Generated video ID: ${videoId}`);
  
      // Step 3: Fetch the generated video
      const videoData = await axios.get(`http://flask_video_app:5002/output/${videoId}`, {
        responseType: 'arraybuffer', // Ensure response is in binary format
      });
  
      // Convert the ArrayBuffer to a Buffer
      const buffer = Buffer.from(videoData.data);
      const extension = '.mp4';
      const filename = `${videoId}-${uuidv4()}${extension}`;
      const filePath = path.join(config.parameters.uploadDir, filename);
  
      // Write the buffer to a file
      fs.writeFileSync(filePath, buffer);
  
      // Create an attachment for the video file
      const uploadedFile = await this.attachmentService.create({
        size: buffer.length,
        type: 'video/mp4',
        name: filename,
        channel: {},
        location: `/${filename}`,
      });
  
      // Create an envelope with the video attachment
      const envelope: StdOutgoingAttachmentEnvelope = {
        format: OutgoingMessageFormat.attachment,
        message: {
          attachment: {
            type: FileType.video,
            payload: {
              ...uploadedFile,
              url: Attachment.getAttachmentUrl(uploadedFile.id, uploadedFile.name),
            },
          },
        },
      };
  
      // Log the envelope being sent
      this.logger.log(`Sending envelope: ${JSON.stringify(envelope)}`);
  
      // Return the envelope
      return envelope;
    } catch (error) {
      // Log any errors that occur during processing
      this.logger.error(`Error processing block: ${error.message}`);
      throw error;
    }
  }
}