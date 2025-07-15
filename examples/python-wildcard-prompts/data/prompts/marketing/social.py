def get_prompt(context):
    platform = context.get('vars', {}).get('platform', 'Twitter')
    brand_voice = context.get('vars', {}).get('brand_voice', 'friendly and approachable')
    
    return f"""Create a {platform} post with the following requirements:

Brand voice: {brand_voice}
Content: {{content}}
Include relevant hashtags and call-to-action.

Make it engaging and shareable.""" 