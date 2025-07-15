module.exports = (context) => {
  const { vars } = context;
  const dataType = vars.dataType || 'numerical data';
  const goal = vars.analysisGoal || 'identify key insights';
  
  return `Analyze the following ${dataType}:

${vars.data || '{{data}}'}

Analysis goal: ${goal}

Please provide:
- Summary statistics
- Key findings
- Visualizations recommendations
- Conclusions and next steps`;
}; 