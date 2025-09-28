#!/usr/bin/env node

const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const glob = require('glob');
const { templates } = require('../lib/blog-templates');
const { generateWorkflow } = require('../lib/workflow-template');
const OpenAI = require('openai');

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
  'web_agency': {
    name: 'Web Design & Digital Agency',
    baseTopics: [
      'responsive web design trends',
      'SEO best practices',
      'local SEO strategies',
      'website speed optimization',
      'mobile-first design',
      'conversion rate optimization',
      'content marketing strategies',
      'social media integration',
      'e-commerce website features',
      'WordPress vs custom development',
      'website accessibility standards',
      'Google Analytics setup',
      'website security essentials',
      'UI/UX design principles',
      'progressive web apps',
      'API integration',
      'website maintenance',
      'domain and hosting',
      'SSL certificates importance',
      'GDPR compliance for websites'
    ]
  },
  'other': {
    name: 'Other Business Type',
    baseTopics: []
  }
};

async function generateTopicsWithAI(businessType, location, apiKey) {
  const openai = new OpenAI({ apiKey });
  const locationName = location.split(',')[0].trim();
  
  try {
    console.log(chalk.cyan('🤖 Generating custom topics for your business type...'));
    
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano-2025-08-07',
      messages: [
        {
          role: 'system',
          content: 'You are an SEO expert who generates blog topics for businesses. Create specific, valuable topics that would help with local SEO.'
        },
        {
          role: 'user',
          content: `Generate 50 specific blog topics for a ${businessType} business in ${location}. 
          Include a mix of:
          - How-to guides
          - Industry trends
          - Local/seasonal topics
          - Common problems and solutions
          - Cost/pricing guides
          - Technology and innovation
          - Regulatory and compliance
          - Case studies
          - Comparisons
          
          Return as a JSON array of strings. Each topic should be specific and valuable for SEO.`
        }
      ],
      response_format: { type: 'json_object' },
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.topics || [];
  } catch (error) {
    console.error(chalk.yellow('Could not generate custom topics, using defaults'));
    return [];
  }
}

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

async function checkExistingPages() {
  // Check for common page patterns in the parent directory (website root)
  const websiteRoot = path.join(process.cwd(), '..');
  const patterns = [
    'pages/**/*.{js,jsx,ts,tsx,vue,svelte}',
    'src/pages/**/*.{js,jsx,ts,tsx,vue,svelte}',
    'src/routes/**/*.{js,jsx,ts,tsx,vue,svelte}',
    'app/**/*.{js,jsx,ts,tsx}',
    'src/app/**/*.{js,jsx,ts,tsx}',
    'content/**/*.md',
    'public/**/*.html',
    '*.html'
  ];
  
  const existingPages = new Set();
  
  for (const pattern of patterns) {
    const files = glob.sync(pattern, { nodir: true, cwd: websiteRoot });
    files.forEach(file => {
      // Extract potential route from file path
      const route = file
        .replace(/\.(js|jsx|ts|tsx|vue|svelte|md|html)$/, '')
        .replace(/^(pages|src\/pages|src\/routes|app|src\/app|content|public)\//, '')
        .replace(/\/index$/, '')
        .replace(/\[.*?\]/g, ':param')
        .toLowerCase();
      
      if (route) {
        existingPages.add(route);
        existingPages.add('/' + route);
      }
    });
  }
  
  // Also check for common blog routes
  ['blog', 'blogs', 'news', 'articles', 'posts', 'resources', 'insights'].forEach(route => {
    if (existingPages.has(route) || existingPages.has('/' + route)) {
      existingPages.add(route);
    }
  });
  
  return Array.from(existingPages);
}

async function detectFramework() {
  // We're running from .blog-generator, so check parent directory
  const websiteRoot = path.join(process.cwd(), '..');
  const packageJsonPath = path.join(websiteRoot, 'package.json');
  
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps.next) return 'nextjs';
    if (deps.gatsby) return 'gatsby';
    if (deps.nuxt || deps.nuxt3) return 'nuxt';
    if (deps.vite && deps.react) return 'vite-react';
    if (deps.vite && deps.vue) return 'vite-vue';
    if (deps['@sveltejs/kit']) return 'sveltekit';
    if (deps['@angular/core']) return 'angular';
    if (deps.express) return 'express';
    if (deps.fastify) return 'fastify';
  }
  
  // Also check for Next.js specific files
  if (await fs.pathExists(path.join(websiteRoot, 'next.config.js')) || 
      await fs.pathExists(path.join(websiteRoot, 'next.config.mjs'))) {
    return 'nextjs';
  }
  
  return 'static';
}

function getDefaultPaths(framework) {
  // Smart defaults based on framework
  const defaults = {
    nextjs: {
      posts: './content/posts',
      images: './public/images/blog'
    },
    gatsby: {
      posts: './content/posts',
      images: './static/images/blog'
    },
    nuxt: {
      posts: './content/posts',
      images: './static/images/blog'
    },
    sveltekit: {
      posts: './content/posts',
      images: './static/images/blog'
    },
    angular: {
      posts: './src/content/posts',
      images: './src/assets/images/blog'
    },
    'vite-react': {
      posts: './content/posts',
      images: './public/images/blog'
    },
    'vite-vue': {
      posts: './content/posts',
      images: './public/images/blog'
    },
    express: {
      posts: './content/posts',
      images: './public/images/blog'
    },
    fastify: {
      posts: './content/posts',
      images: './public/images/blog'
    },
    static: {
      posts: './content/posts',
      images: './images/blog'
    }
  };
  
  return defaults[framework] || defaults.static;
}

async function createBlogIndexPage(slug, config, framework) {
  const spinner = ora(`Creating blog index page for ${framework}...`).start();
  
  try {
    const template = templates[framework];
    if (!template) {
      spinner.warn(`No template available for ${framework}, skipping blog page creation`);
      return;
    }
    
    // Get the website root (parent of .blog-generator)
    const websiteRoot = path.join(process.cwd(), '..');
    
    // Determine where to create the blog page based on framework
    let pagePath;
    switch (framework) {
      case 'nextjs':
        // Check for app directory (App Router) vs pages directory
        if (await fs.pathExists(path.join(websiteRoot, 'app'))) {
          pagePath = path.join(websiteRoot, 'app', slug, 'page.jsx');
        } else if (await fs.pathExists(path.join(websiteRoot, 'src/app'))) {
          pagePath = path.join(websiteRoot, 'src/app', slug, 'page.jsx');
        } else if (await fs.pathExists(path.join(websiteRoot, 'pages'))) {
          pagePath = path.join(websiteRoot, 'pages', `${slug}.jsx`);
        } else if (await fs.pathExists(path.join(websiteRoot, 'src/pages'))) {
          pagePath = path.join(websiteRoot, 'src/pages', `${slug}.jsx`);
        } else {
          // Default to pages directory
          pagePath = path.join(websiteRoot, 'pages', `${slug}.jsx`);
        }
        
        // Also create the lib file for Next.js
        const libPath = path.join(websiteRoot, 'lib', 'blog.js');
        await fs.ensureDir(path.dirname(libPath));
        await fs.writeFile(libPath, template.lib());
        break;
        
      case 'gatsby':
        pagePath = path.join(websiteRoot, 'src/pages', `${slug}.js`);
        break;
        
      case 'nuxt':
        pagePath = path.join(websiteRoot, 'pages', `${slug}.vue`);
        break;
        
      case 'sveltekit':
        pagePath = path.join(websiteRoot, 'src/routes', slug, '+page.svelte');
        
        // Also create the loader file
        const loaderPath = path.join(websiteRoot, 'src/routes', slug, '+page.js');
        await fs.ensureDir(path.dirname(loaderPath));
        await fs.writeFile(loaderPath, template.loader());
        break;
        
      case 'static':
      default:
        // For static sites, create in the website root
        pagePath = path.join(websiteRoot, `${slug}.html`);
        break;
    }
    
    // Ensure directory exists
    await fs.ensureDir(path.dirname(pagePath));
    
    // Write the blog page
    await fs.writeFile(pagePath, template.page(slug, config));
    
    spinner.succeed(`Blog index page created at: ${pagePath}`);
    
    // Provide framework-specific instructions
    console.log(chalk.cyan('\n📝 Blog Page Setup Instructions:'));
    
    switch (framework) {
      case 'nextjs':
        console.log(chalk.yellow('  ⚠️  REQUIRED: Install gray-matter package:'));
        console.log(chalk.white('     cd .. && npm install gray-matter'));
        console.log(chalk.gray(`  - Your blog is available at: /${slug}`));
        console.log(chalk.gray(`  - Blog posts will be at: /${slug}/[slug]`));
        break;
      case 'gatsby':
        console.log(chalk.gray('  - Make sure you have gatsby-transformer-remark installed'));
        console.log(chalk.gray('  - Update gatsby-config.js to include the content/posts directory'));
        break;
      case 'nuxt':
        console.log(chalk.gray('  - Make sure @nuxt/content module is installed'));
        console.log(chalk.gray('  - Posts should be in content/posts directory'));
        break;
      case 'sveltekit':
        console.log(chalk.gray(`  - Blog page created at /src/routes/${slug}/+page.svelte`));
        console.log(chalk.gray('  - Create individual post pages at /src/routes/[slug]/+page.svelte'));
        break;
      case 'static':
        console.log(chalk.gray(`  - Static HTML page created at ${slug}.html`));
        console.log(chalk.gray('  - You may need to create an API endpoint to serve post data'));
        break;
    }
    
  } catch (error) {
    spinner.fail(`Failed to create blog page: ${error.message}`);
  }
}

async function init() {
  console.log(chalk.blue.bold('\n🚀 SEO Blog Generator Setup Wizard\n'));
  
  try {
    // Detect framework
    const framework = await detectFramework();
    console.log(chalk.cyan(`Detected framework: ${framework}\n`));
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
    
    // Check existing pages
    const spinner = ora('Checking for existing pages...').start();
    const existingPages = await checkExistingPages();
    spinner.succeed('Page check complete');
    
    // Collect business information
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'businessName',
        message: 'What is your business name?',
        validate: input => input.length > 0 || 'Business name is required'
      },
      {
        type: 'input',
        name: 'openaiKey',
        message: 'Enter your OpenAI API key (needed for content generation):',
        validate: input => input.length > 0 || 'API key is required'
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
        name: 'blogSlug',
        message: 'What URL slug would you like for your blog section?',
        default: answers => {
          // Suggest available slugs
          const suggestions = ['blog', 'blogs', 'news', 'articles', 'insights', 'resources', 'updates'];
          const available = suggestions.find(s => !existingPages.includes(s) && !existingPages.includes('/' + s));
          return available || 'blog';
        },
        validate: input => {
          const slug = input.toLowerCase().replace(/^\//, '').replace(/\/$/, '');
          
          if (!/^[a-z0-9-]+$/.test(slug)) {
            return 'Slug can only contain lowercase letters, numbers, and hyphens';
          }
          
          if (existingPages.includes(slug) || existingPages.includes('/' + slug)) {
            return chalk.red(`⚠️  The slug "/${slug}" already exists in your project. Please choose a different one.`);
          }
          
          return true;
        },
        filter: input => input.toLowerCase().replace(/^\//, '').replace(/\/$/, '')
      },
      {
        type: 'confirm',
        name: 'createBlogPage',
        message: 'Would you like to auto-create the blog index page?',
        default: true
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
      },
      {
        type: 'confirm',
        name: 'setupGitHub',
        message: 'Would you like to set up GitHub Actions for automatic generation?',
        default: true
      }
    ]);
    
    const setupSpinner = ora('Generating configuration...').start();
    
    // Get default paths for the detected framework
    const defaultPaths = getDefaultPaths(framework);
    
    // Generate topics based on business type
    const businessTypeKey = answers.businessType === 'other' ? 'other' : answers.businessType;
    const businessTypeName = answers.customBusinessType || businessTypes[businessTypeKey].name;
    
    let topics;
    if (answers.businessType === 'other' && answers.customBusinessType) {
      // Use AI to generate topics for custom business type
      const aiTopics = await generateTopicsWithAI(
        answers.customBusinessType,
        answers.location,
        answers.openaiKey
      );
      
      if (aiTopics.length > 0) {
        topics = aiTopics;
      } else {
        // Fallback to basic topic generation
        topics = generateTopicsForBusiness(
          businessTypeKey,
          answers.businessName,
          answers.location,
          answers.nearbyAreas
        );
      }
    } else {
      // Use predefined topics for known business types
      topics = generateTopicsForBusiness(
        businessTypeKey,
        answers.businessName,
        answers.location,
        answers.nearbyAreas
      );
    }
    
    // Create configuration
    const config = {
      business: {
        name: answers.businessName,
        type: businessTypeName.toLowerCase(),
        location: answers.location,
        nearbyAreas: answers.nearbyAreas,
        website: answers.websiteUrl
      },
      blog: {
        slug: answers.blogSlug,
        url: `${answers.websiteUrl}/${answers.blogSlug}`,
        createIndexPage: answers.createBlogPage
      },
      ai: {
        model: answers.aiModel,
        generateImages: answers.generateImages,
        imageModel: 'dall-e-2'
      },
      output: {
        postsPath: defaultPaths.posts,
        imagesPath: defaultPaths.images
      },
      schedule: {
        cron: answers.schedule
      },
      framework: framework,
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
    await fs.ensureDir(path.join(process.cwd(), defaultPaths.posts));
    await fs.ensureDir(path.join(process.cwd(), defaultPaths.images));
    
    // Create topic history file
    await fs.writeJson(
      path.join(process.cwd(), 'topic-history.json'),
      []
    );
    
    // Create blog index page if requested
    if (answers.createBlogPage) {
      await createBlogIndexPage(answers.blogSlug, config, framework);
      
      // Install gray-matter for Next.js projects
      if (framework === 'nextjs') {
        const installSpinner = ora('Installing gray-matter dependency for Next.js...').start();
        try {
          const { execSync } = require('child_process');
          const websiteRoot = path.dirname(process.cwd());
          execSync('npm install gray-matter', { cwd: websiteRoot, stdio: 'ignore' });
          installSpinner.succeed('Installed gray-matter dependency');
        } catch (error) {
          installSpinner.warn('Could not auto-install gray-matter. Please run: npm install gray-matter');
        }
      }
    }
    
    // Set up GitHub Actions if requested
    if (answers.setupGitHub) {
      const workflowSpinner = ora('Setting up GitHub Actions...').start();
      try {
        // Create workflow in website root, not in .blog-generator
        const websiteRoot = path.dirname(process.cwd());
        const workflowDir = path.join(websiteRoot, '.github', 'workflows');
        await fs.ensureDir(workflowDir);
        
        const workflowContent = generateWorkflow(config);
        const workflowPath = path.join(workflowDir, 'blog-generation.yml');
        
        await fs.writeFile(workflowPath, workflowContent);
        workflowSpinner.succeed('GitHub Actions workflow created in website root');
      } catch (error) {
        workflowSpinner.warn(`Could not create GitHub workflow: ${error.message}`);
      }
    }
    
    setupSpinner.succeed('Configuration created successfully!');
    
    console.log(chalk.green('\n✅ Setup complete!\n'));
    console.log(chalk.cyan('Generated configuration:'));
    console.log(chalk.gray(`  - Config file: ${configPath}`));
    console.log(chalk.gray(`  - Environment file: .env`));
    console.log(chalk.gray(`  - Topics generated: ${topics.length}`));
    console.log(chalk.gray(`  - Blog posts will be saved to: ${defaultPaths.posts}`));
    console.log(chalk.gray(`  - Images will be saved to: ${defaultPaths.images}`));
    
    if (answers.setupGitHub) {
      console.log(chalk.gray(`  - GitHub Actions workflow: .github/workflows/blog-generation.yml`));
    }
    
    console.log(chalk.yellow('\n📝 Next steps:'));
    console.log(chalk.white('  1. Run a test generation:'));
    console.log(chalk.gray('     npm run generate'));
    
    if (answers.setupGitHub) {
      console.log(chalk.white('  2. Set up GitHub Actions:'));
      console.log(chalk.gray('     - Add OPENAI_API_KEY to GitHub Secrets'));
      console.log(chalk.gray('     - Commit and push: git add . && git commit -m "Add blog generator" && git push'));
      console.log(chalk.gray('     - Posts will generate automatically on schedule'));
    } else {
      console.log(chalk.white('  2. Set up automation:'));
      console.log(chalk.gray('     npm run schedule      (local scheduling)'));
      console.log(chalk.gray('     npx blog-generator setup-github  (GitHub Actions)'));
    }
    
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