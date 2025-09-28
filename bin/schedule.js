const cron = require('node-cron');
const chalk = require('chalk');
const { generate } = require('../lib/generate');

async function schedule(configPath) {
  const config = require(configPath);
  
  if (!config.schedule || config.schedule.cron === 'manual') {
    console.log(chalk.yellow('Manual mode selected. Use "blog-generator generate" to create posts.'));
    return;
  }
  
  console.log(chalk.blue(`🕐 Starting scheduler with cron: ${config.schedule.cron}`));
  console.log(chalk.gray('Press Ctrl+C to stop\n'));
  
  const task = cron.schedule(config.schedule.cron, async () => {
    const timestamp = new Date().toLocaleString();
    console.log(chalk.cyan(`[${timestamp}] Running scheduled generation...`));
    
    try {
      await generate(configPath);
      console.log(chalk.green(`[${timestamp}] Generation completed successfully!\n`));
    } catch (error) {
      console.error(chalk.red(`[${timestamp}] Generation failed:`), error.message);
    }
  });
  
  task.start();
  
  // Keep the process alive
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\nStopping scheduler...'));
    task.stop();
    process.exit();
  });
}

module.exports = { schedule };