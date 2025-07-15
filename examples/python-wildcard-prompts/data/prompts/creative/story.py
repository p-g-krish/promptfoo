def get_prompt(context):
    genre = context.get('vars', {}).get('genre', 'science fiction')
    style = context.get('vars', {}).get('style', 'descriptive and immersive')
    
    return f"""Write a {genre} story with the following elements:

Theme: {{theme}}
Setting: {{setting}}

Writing style: {style}

Create an engaging narrative with:
- Compelling characters
- Vivid descriptions
- A clear beginning, middle, and end
- Appropriate pacing for {genre}""" 