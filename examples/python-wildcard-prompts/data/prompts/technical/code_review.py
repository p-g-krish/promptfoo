def get_prompt(context):
    language = context.get('vars', {}).get('language', 'Python')
    focus_areas = context.get('vars', {}).get('focus_areas', 'general best practices')
    
    return f"""You are an expert {language} code reviewer. Review the following code:

{{code}}

Focus on: {focus_areas}

Provide constructive feedback on:
1. Code quality and maintainability
2. Performance considerations
3. Security issues
4. Best practices
5. Potential bugs""" 