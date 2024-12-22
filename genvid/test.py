import requests
import json

# Define the URL for the OpenRouter API
OPENROUTER_API_KEY = ''
YOUR_SITE_URL = 'http://your-site-url.com'
YOUR_APP_NAME = 'YourAppName'

def process_gemini(user_input):
    print(f"Received user input: {user_input}")

    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "HTTP-Referer": f"{YOUR_SITE_URL}",
            "X-Title": f"{YOUR_APP_NAME}",
        },
        data=json.dumps({
            "model": "google/gemini-2.0-flash-thinking-exp:free",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": user_input
                        }
                    ]
                }
            ]
        })
    )

    if response.status_code == 200:
        gemini_response = response.json()
        print(f"Gemini response: {gemini_response}")
        return gemini_response
    else:
        print(f"Failed to process Gemini request: {response.status_code}")
        return {'error': 'Failed to process Gemini request'}, response.status_code

if __name__ == '__main__':
    # Prompt the user to input text
    user_input = input("Enter text to process with Gemini: ")

    # Call the process_gemini function with the user input
    response = process_gemini(user_input)

    # Print the response from the Gemini API
    if isinstance(response, dict) and 'error' in response:
        print(response['error'])
    else:
        print("Gemini response:")
        print(json.dumps(response, indent=2))