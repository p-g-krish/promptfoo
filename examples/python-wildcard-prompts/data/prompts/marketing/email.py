def get_prompt(context):
    product = context.get('vars', {}).get('product', 'our product')
    tone = context.get('vars', {}).get('tone', 'professional')
    
    return f"""You are a marketing email specialist. Write a compelling email for {product}.
    
Tone: {tone}
Target audience: {{audience}}

Create an engaging subject line and body that drives conversions.""" 