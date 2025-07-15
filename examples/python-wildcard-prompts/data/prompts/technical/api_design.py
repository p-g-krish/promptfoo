def get_prompt(context):
    api_type = context.get('vars', {}).get('api_type', 'REST')
    requirements = context.get('vars', {}).get('requirements', 'standard CRUD operations')
    
    return f"""Design a {api_type} API for the following requirements:

{{description}}

Specific requirements: {requirements}

Include:
1. Endpoint definitions
2. Request/response schemas
3. Authentication approach
4. Error handling patterns
5. Best practices for {api_type} APIs""" 