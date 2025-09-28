#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const { init } = require('./init');
const { generate } = require('../lib/generate');
const { schedule } = require('./schedule');
const fs = require('fs-extra');
const path = require('path');
const { generateWorkflow } = require('../lib/workflow-template');

const program = new Command();

program
  .name('blog-generator')
  .description('SEO Blog Generator - Automated content creation for local businesses')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize blog generator with interactive setup')
  .action(async () => {
    await init();
  });

program
  .command('generate')
  .description('Generate a single blog post')
  .option('-c, --config <path>', 'path to config file', './blog-generator.config.js')
  .action(async (options) => {
    try {
      const configPath = path.resolve(options.config);
      if (!await fs.pathExists(configPath)) {
        console.error(chalk.red('Config file not found. Run "blog-generator init" first.'));
        process.exit(1);
      }
      
      console.log(chalk.blue('🚀 Generating blog post...'));
      await generate(configPath);
      console.log(chalk.green('✅ Blog post generated successfully!'));
    } catch (error) {
      console.error(chalk.red('Generation failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('schedule')
  .description('Start scheduled blog generation')
  .option('-c, --config <path>', 'path to config file', './blog-generator.config.js')
  .action(async (options) => {
    try {
      const configPath = path.resolve(options.config);
      if (!await fs.pathExists(configPath)) {
        console.error(chalk.red('Config file not found. Run "blog-generator init" first.'));
        process.exit(1);
      }
      
      await schedule(configPath);
    } catch (error) {
      console.error(chalk.red('Scheduler failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Show generation statistics')
  .action(async () => {
    try {
      const historyPath = path.join(process.cwd(), 'topic-history.json');
      if (!await fs.pathExists(historyPath)) {
        console.log(chalk.yellow('No posts generated yet.'));
        return;
      }
      
      const history = await fs.readJson(historyPath);
      console.log(chalk.cyan(`\n📊 Blog Generation Statistics\n`));
      console.log(`Total posts generated: ${chalk.green(history.length)}`);
      
      if (history.length > 0) {
        const latest = new Date(history[history.length - 1].date);
        const first = new Date(history[0].date);
        console.log(`First post: ${chalk.gray(first.toLocaleDateString())}`);
        console.log(`Latest post: ${chalk.gray(latest.toLocaleDateString())}`);
        
        // Show recent topics
        console.log(chalk.cyan('\nRecent topics:'));
        history.slice(-5).reverse().forEach(item => {
          console.log(chalk.gray(`  - ${item.topic}`));
        });
      }
    } catch (error) {
      console.error(chalk.red('Failed to read statistics:'), error.message);
    }
  });

program
  .command('reset')
  .description('Reset topic history')
  .option('-f, --force', 'skip confirmation')
  .action(async (options) => {
    try {
      if (!options.force) {
        const inquirer = require('inquirer');
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'This will reset all topic history. Continue?',
            default: false
          }
        ]);
        
        if (!confirm) {
          console.log(chalk.yellow('Reset cancelled.'));
          return;
        }
      }
      
      await fs.writeJson(path.join(process.cwd(), 'topic-history.json'), []);
      console.log(chalk.green('✅ Topic history reset successfully!'));
    } catch (error) {
      console.error(chalk.red('Reset failed:'), error.message);
    }
  });

program
  .command('setup-github')
  .description('Set up GitHub Actions for automated generation')
  .option('-c, --config <path>', 'path to config file', './blog-generator.config.js')
  .action(async (options) => {
    try {
      const configPath = path.resolve(options.config);
      if (!await fs.pathExists(configPath)) {
        console.error(chalk.red('Config file not found. Run "blog-generator init" first.'));
        process.exit(1);
      }
      
      const config = require(configPath);
      
      console.log(chalk.blue('🚀 Setting up GitHub Actions...\n'));
      
      // Check if .github/workflows exists
      const workflowDir = path.join(process.cwd(), '.github', 'workflows');
      await fs.ensureDir(workflowDir);
      
      // Generate workflow file
      const workflowContent = generateWorkflow(config);
      const workflowPath = path.join(workflowDir, 'blog-generation.yml');
      
      // Check if workflow already exists
      if (await fs.pathExists(workflowPath)) {
        const inquirer = require('inquirer');
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: 'GitHub Actions workflow already exists. Overwrite?',
            default: false
          }
        ]);
        
        if (!overwrite) {
          console.log(chalk.yellow('Setup cancelled.'));
          return;
        }
      }
      
      await fs.writeFile(workflowPath, workflowContent);
      
      console.log(chalk.green('✅ GitHub Actions workflow created!\n'));
      console.log(chalk.cyan('📝 Next steps:'));
      console.log(chalk.white('  1. Add your OpenAI API key to GitHub Secrets:'));
      console.log(chalk.gray('     - Go to your repo Settings > Secrets and variables > Actions'));
      console.log(chalk.gray('     - Click "New repository secret"'));
      console.log(chalk.gray('     - Name: OPENAI_API_KEY'));
      console.log(chalk.gray('     - Value: Your OpenAI API key'));
      console.log();
      console.log(chalk.white('  2. Commit and push the workflow:'));
      console.log(chalk.gray('     git add .github/workflows/blog-generation.yml'));
      console.log(chalk.gray('     git commit -m "Add automated blog generation"'));
      console.log(chalk.gray('     git push'));
      console.log();
      console.log(chalk.white('  3. The workflow will run automatically based on your schedule:'));
      console.log(chalk.gray(`     ${config.schedule.cron === 'manual' ? 'Weekly on Mondays' : config.schedule.cron}`));
      console.log();
      console.log(chalk.white('  4. You can also trigger it manually:'));
      console.log(chalk.gray('     Go to Actions tab > Generate Blog Post > Run workflow'));
      
    } catch (error) {
      console.error(chalk.red('Setup failed:'), error.message);
      process.exit(1);
    }
  });

program.parse();