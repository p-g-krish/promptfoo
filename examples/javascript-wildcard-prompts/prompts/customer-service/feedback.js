module.exports = ({ vars }) => {
  const sentiment = vars.sentimentFocus || 'both positive and negative';
  
  return `Analyze the following customer feedback:

${vars.feedback || '{{feedback}}'}

Focus on ${sentiment} aspects.

Provide:
1. Overall sentiment analysis
2. Key themes and patterns
3. Actionable insights for improvement
4. Priority recommendations`;
}; 