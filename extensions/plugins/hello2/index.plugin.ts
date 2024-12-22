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

@Injectable()
export class Hello2Plugin extends BaseBlockPlugin<typeof SETTINGS> {
  template: PluginBlockTemplate = { name: 'Learn sign language' };

  constructor(
    pluginService: PluginService,
    private logger: LoggerService,
    private attachmentService: AttachmentService,
  ) {
    super('hello2-plugin', pluginService);
  }

  getPath(): string {
    return __dirname;
  }

  /**
   * Process the user input, generate a video, and return the video as an attachment.
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
      // Step 1: Log the request body
      this.logger.log(`step 1`);
      this.logger.log(`Request body: ${JSON.stringify({ message: userText })}`);
      
      // Step 2: Send the user text to the Flask API to generate a video
      const response = await axios.post('http://flask_video_app:5002/generate-video', { message: userText });
  
      // Step 3: Check the response status and log the response
      if (response.status !== 200) {
        this.logger.error(`Failed to fetch video: ${response.statusText}`);
        throw new Error(`Failed to fetch video: ${response.statusText}`);
      }
      const videoId = response.data.videoId;
  
      // Step 4: Fetch the generated video from the Flask API
      const answer = await axios.get(`http://flask_video_app:5002/output/${videoId}`, {
        responseType: 'arraybuffer', // Ensure response is in binary format
      });
  
      // Step 5: Convert the ArrayBuffer to a Buffer
      const buffer = Buffer.from(answer.data);
      const extension = '.mp4';
      const filename = `${videoId}-${uuidv4()}${extension}`;
      const filePath = path.join(config.parameters.uploadDir, filename);
  
      // Step 6: Write the buffer to a file
      fs.writeFileSync(filePath, buffer);
  
      // Step 7: Create an attachment for the video file
      const uploadedFile = await this.attachmentService.create({
        size: buffer.length,
        type: 'video/mp4',
        name: filename,
        channel: {},
        location: `/${filename}`,
      });
  
      // Step 8: Create an envelope with the video attachment
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
  
      // Step 9: Log the envelope being sent
      this.logger.log(`Sending envelope: ${JSON.stringify(envelope)}`);
  
      // Step 10: Return the envelope
      return envelope;
    } catch (error) {
      // Log any errors that occur during processing
      this.logger.error(`Error processing block: ${error.message}`);
      throw error;
    }
  }
}