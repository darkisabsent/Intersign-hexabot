from flask import Flask, request, jsonify, send_from_directory, abort
import os
import uuid
from moviepy.editor import concatenate_videoclips, VideoFileClip

app = Flask(__name__)

# Folder where the video will be stored
OUTPUT_FOLDER = 'output'

@app.route('/generate-video', methods=['POST'])
def generate_video():
    # Get the JSON data from the request
    data = request.json
    message = data['message']
    print(f"Received message: {message}")
    video_clips = []

    # Iterate over each character in the message
    for char in message.upper():
        if char.isalpha():
            # Construct the path to the video clip for the character
            video_path = os.path.join('dataset', f'{char}.mp4')
            if os.path.exists(video_path):
                print(f"Adding video clip for character: {char}")
                # Add the video clip to the list
                video_clips.append(VideoFileClip(video_path))
            else:
                print(f"Video clip not found for character: {char}")

    # Check if there are no valid video clips
    if not video_clips:
        print("No valid video clips found")
        return jsonify({'error': 'No valid video clips found'}), 400

    # Concatenate the video clips into a single video
    final_clip = concatenate_videoclips(video_clips, method="compose")
    video_id = str(uuid.uuid4())
    output_path = os.path.join(OUTPUT_FOLDER, f'{video_id}.mp4')
    
    # Save the final video clip
    final_clip.write_videofile(output_path, codec='libx264', fps=24)
    print(f"Generated video ID: {video_id}")

    # Return the video ID as a JSON response
    return jsonify({'videoId': video_id})

@app.route('/output/<video_id>')
def serve_video(video_id):
    # Serve the video file from the 'output' folder
    file_path = os.path.join(OUTPUT_FOLDER, f'{video_id}.mp4')
    if os.path.exists(file_path):
        return send_from_directory(OUTPUT_FOLDER, f'{video_id}.mp4')
    else:
        print(f"File not found: {file_path}")
        return abort(404, description="Resource not found")

if __name__ == '__main__':
    # Create the output folder if it doesn't exist
    if not os.path.exists(OUTPUT_FOLDER):
        os.makedirs(OUTPUT_FOLDER)
    # Run the Flask application
    app.run(host='0.0.0.0', port=5002, debug=True)