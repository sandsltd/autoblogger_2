#!/usr/bin/env node

const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');

const businessTypes = {
  'window_cleaner': {
    name: 'Window Cleaner',
    baseTopics: [
      'streak-free cleaning techniques',
      'seasonal cleaning schedules',
      'commercial vs residential cleaning',
      'safety equipment and procedures',
      'hard water stain removal',
      'eco-friendly cleaning solutions'
    ]
  },
  'plumber': {
    name: 'Plumber',
    baseTopics: [
      'emergency leak repairs',
      'boiler maintenance tips',
      'preventing frozen pipes',
      'bathroom renovation planning',
      'water pressure problems',
      'eco-friendly plumbing solutions'
    ]
  },
  'electrician': {
    name: 'Electrician',
    baseTopics: [
      'electrical safety at home',
      'smart home installations',
      'energy saving tips',
      'common wiring problems',
      'EV charger installation',
      'electrical inspection importance'
    ]
  },
  'gardener': {
    name: 'Gardener/Landscaper',
    baseTopics: [
      'seasonal garden maintenance',
      'lawn care techniques',
      'pest control solutions',
      'native plant benefits',
      'garden design trends',
      'composting guide'
    ]
  },
  'roofer': {
    name: 'Roofer',
    baseTopics: [
      'roof inspection checklist',
      'storm damage prevention',
      'gutter maintenance',
      'roof material comparison',
      'insulation benefits',
      'emergency repair tips'
    ]
  },
  'painter': {
    name: 'Painter/Decorator',
    baseTopics: [
      'paint type selection',
      'colour psychology',
      'preparation techniques',
      'wallpaper vs paint',
      'exterior painting tips',
      'eco-friendly paints'
    ]
  },
  'cleaner': {
    name: 'House Cleaner',
    baseTopics: [
      'deep cleaning checklist',
      'eco-friendly products',
      'time-saving techniques',
      'allergen removal',
      'organizing tips',
      'carpet care guide'
    ]
  },
  'builder': {
    name: 'Builder/Construction',
    baseTopics: [
      'home extension planning',
      'building regulations guide',
      'sustainable materials',
      'project timeline tips',
      'budget planning',
      'choosing contractors'
    ]
  },
  'carpenter': {
    name: 'Carpenter/Joiner',
    baseTopics: [
      'wood type selection',
      'furniture restoration',
      'custom storage solutions',
      'tool maintenance',
      'sustainable woodworking',
      'repair vs replace'
    ]
  },
  'locksmith': {
    name: 'Locksmith',
    baseTopics: [
      'home security assessment',
      'smart lock technology',
      'emergency lockout tips',
      'key management',
      'UPVC door problems',
      'security upgrades'
    ]
  },
  'other': {
    name: 'Other Business Type',
    baseTopics: []
  }
};

function generateTopicsForBusiness(businessType, businessName, location, nearbyAreas) {
  const baseTopics = businessTypes[businessType]?.baseTopics || [];
  const locationName = location.split(',')[0].trim();
  
  // Generate location-specific and seasonal variations
  const topics = [];
  
  // Add base topics with location variants
  baseTopics.forEach(topic => {
    topics.push(topic);
    topics.push(`${topic} in ${locationName}`);
    topics.push(`Best ${topic} for ${location} properties`);
  });
  
  // Add seasonal topics
  const seasons = ['spring', 'summer', 'autumn', 'winter'];
  seasons.forEach(season => {
    topics.push(`${season} ${businessTypes[businessType]?.name.toLowerCase() || businessType} tips for ${locationName}`);
    topics.push(`Preparing for ${season} in ${location}`);
  });
  
  // Add comparison topics
  topics.push(`DIY vs professional ${businessTypes[businessType]?.name.toLowerCase() || businessType} in ${locationName}`);
  topics.push(`Cost guide for ${location} ${new Date().getFullYear()}`);
  topics.push(`Common problems in ${locationName} properties`);
  
  // Add nearby area topics
  nearbyAreas.forEach(area => {
    topics.push(`Services available in ${area}`);
  });
  
  // Add regulation and compliance topics
  topics.push(`UK regulations for ${businessTypes[businessType]?.name.toLowerCase() || businessType}`);
  topics.push(`Insurance and liability in ${location}`);
  topics.push(`Health and safety requirements`);
  
  // Add property type specific topics
  const propertyTypes = ['Victorian homes', 'modern flats', 'listed buildings', 'commercial properties', 'new builds'];
  propertyTypes.forEach(type => {
    topics.push(`${businessTypes[businessType]?.name.toLowerCase() || businessType} for ${type} in ${locationName}`);
  });
  
  return topics;
}

async function init() {
  console.log(chalk.blue.bold('\n🚀 SEO Blog Generator Setup Wizard\n'));
  
  try {
    // Check if config already exists
    const configPath = path.join(process.cwd(), 'blog-generator.config.js');
    if (await fs.pathExists(configPath)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'Configuration already exists. Overwrite?',
          default: false
        }
      ]);
      
      if (!overwrite) {
        console.log(chalk.yellow('Setup cancelled.'));
        return;
      }
    }
    
    // Collect business information
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'businessName',
        message: 'What is your business name?',
        validate: input => input.length > 0 || 'Business name is required'
      },
      {
        type: 'list',
        name: 'businessType',
        message: 'What type of business is it?',
        choices: Object.entries(businessTypes).map(([key, value]) => ({
          name: value.name,
          value: key
        }))
      },
      {
        type: 'input',
        name: 'customBusinessType',
        message: 'Please specify your business type:',
        when: answers => answers.businessType === 'other',
        validate: input => input.length > 0 || 'Business type is required'
      },
      {
        type: 'input',
        name: 'location',
        message: 'What is your business location? (e.g., "Yeovil, Somerset")',
        validate: input => input.length > 0 || 'Location is required'
      },
      {
        type: 'input',
        name: 'nearbyAreas',
        message: 'List nearby areas you serve (comma-separated):',
        filter: input => input.split(',').map(area => area.trim()).filter(Boolean)
      },
      {
        type: 'input',
        name: 'websiteUrl',
        message: 'What is your website URL?',
        validate: input => {
          try {
            new URL(input);
            return true;
          } catch {
            return 'Please enter a valid URL';
          }
        }
      },
      {
        type: 'input',
        name: 'openaiKey',
        message: 'Enter your OpenAI API key:',
        validate: input => input.length > 0 || 'API key is required'
      },
      {
        type: 'list',
        name: 'aiModel',
        message: 'Which AI model to use?',
        choices: [
          { name: 'GPT-5-nano (Latest, most cost-effective)', value: 'gpt-5-nano-2025-08-07' },
          { name: 'GPT-4 Turbo', value: 'gpt-4-turbo-preview' },
          { name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
        ],
        default: 'gpt-5-nano-2025-08-07'
      },
      {
        type: 'confirm',
        name: 'generateImages',
        message: 'Generate images for blog posts?',
        default: true
      },
      {
        type: 'input',
        name: 'outputPath',
        message: 'Where to save blog posts? (relative path)',
        default: './content/posts'
      },
      {
        type: 'input',
        name: 'imagePath',
        message: 'Where to save images? (relative path)',
        default: './public/images/blog'
      },
      {
        type: 'list',
        name: 'schedule',
        message: 'How often to generate posts?',
        choices: [
          { name: 'Every hour', value: '0 * * * *' },
          { name: 'Every 3 hours', value: '0 */3 * * *' },
          { name: 'Every 6 hours', value: '0 */6 * * *' },
          { name: 'Daily at 9am', value: '0 9 * * *' },
          { name: 'Twice daily (9am & 3pm)', value: '0 9,15 * * *' },
          { name: 'Manual only', value: 'manual' }
        ]
      }
    ]);
    
    const spinner = ora('Generating configuration...').start();
    
    // Generate topics based on business type
    const businessTypeKey = answers.businessType === 'other' ? 'other' : answers.businessType;
    const businessTypeName = answers.customBusinessType || businessTypes[businessTypeKey].name;
    const topics = generateTopicsForBusiness(
      businessTypeKey,
      answers.businessName,
      answers.location,
      answers.nearbyAreas
    );
    
    // Create configuration
    const config = {
      business: {
        name: answers.businessName,
        type: businessTypeName.toLowerCase(),
        location: answers.location,
        nearbyAreas: answers.nearbyAreas,
        website: answers.websiteUrl
      },
      ai: {
        model: answers.aiModel,
        generateImages: answers.generateImages,
        imageModel: 'dall-e-2'
      },
      output: {
        postsPath: answers.outputPath,
        imagesPath: answers.imagePath
      },
      schedule: {
        cron: answers.schedule
      },
      prompts: {
        context: `You are writing for ${answers.businessName}, a professional ${businessTypeName.toLowerCase()} company in ${answers.location}.
- Always mention local context when relevant
- Use British English spelling and terminology
- Reference UK regulations when relevant
- Mention nearby areas occasionally: ${answers.nearbyAreas.join(', ')}
- Include seasonal considerations relevant to the local weather
- Be helpful and informative while subtly establishing local expertise

CRITICAL for avoiding AI detection:
- Write in a conversational, human tone with natural variations in sentence length
- Include personal anecdotes or real-world examples when appropriate
- Add specific local details
- Use colloquialisms and natural speech patterns
- Vary paragraph lengths naturally
- Include minor imperfections that humans would make`,
        system: `You are a local ${businessTypeName.toLowerCase()} in ${answers.location} who writes blog posts based on real experience. Write naturally with personality. Always respond with valid JSON.`
      },
      topics: topics
    };
    
    // Save configuration
    await fs.writeFile(
      configPath,
      `module.exports = ${JSON.stringify(config, null, 2)};`
    );
    
    // Create .env file
    await fs.writeFile(
      path.join(process.cwd(), '.env'),
      `OPENAI_API_KEY=${answers.openaiKey}\n`
    );
    
    // Create directories
    await fs.ensureDir(path.join(process.cwd(), answers.outputPath));
    await fs.ensureDir(path.join(process.cwd(), answers.imagePath));
    
    // Create topic history file
    await fs.writeJson(
      path.join(process.cwd(), 'topic-history.json'),
      []
    );
    
    spinner.succeed('Configuration created successfully!');
    
    console.log(chalk.green('\n✅ Setup complete!\n'));
    console.log(chalk.cyan('Generated configuration:'));
    console.log(chalk.gray(`  - Config file: ${configPath}`));
    console.log(chalk.gray(`  - Environment file: .env`));
    console.log(chalk.gray(`  - Topics generated: ${topics.length}`));
    
    console.log(chalk.yellow('\n📝 Next steps:'));
    console.log(chalk.white('  1. Run a test generation:'));
    console.log(chalk.gray('     npm run generate'));
    console.log(chalk.white('  2. Set up automated scheduling:'));
    console.log(chalk.gray('     npm run schedule'));
    console.log(chalk.white('  3. View all commands:'));
    console.log(chalk.gray('     npx blog-generator --help'));
    
  } catch (error) {
    console.error(chalk.red('Setup failed:'), error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  init();
}

module.exports = { init, generateTopicsForBusiness };