const OpenAI = require('openai');
const fs = require('fs-extra');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

async function downloadImage(imageUrl, filename, imagesPath, config) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // For Next.js and other frameworks, save to public folder
    const websiteRoot = path.dirname(process.cwd());
    const publicImagesPath = path.join(websiteRoot, 'public', 'images', 'blog');
    
    // Also save to blog-generator folder for backup
    await fs.ensureDir(imagesPath);
    const backupPath = path.join(imagesPath, filename);
    
    // Save to public folder if it exists
    let savedToPublic = false;
    if (await fs.pathExists(path.join(websiteRoot, 'public'))) {
      await fs.ensureDir(publicImagesPath);
      const publicImagePath = path.join(publicImagesPath, filename);
      const buffer = await response.buffer();
      await fs.writeFile(publicImagePath, buffer);
      await fs.writeFile(backupPath, buffer); // Also save backup
      savedToPublic = true;
    } else {
      // Just save to blog-generator folder if no public folder
      const buffer = await response.buffer();
      await fs.writeFile(backupPath, buffer);
    }
    
    // Return relative path for web
    return `/images/blog/${filename}`;
  } catch (error) {
    console.error('Error downloading image:', error);
    return null;
  }
}

async function generateBlogImage(topic, title, config, openai) {
  if (!config.ai.generateImages) return null;
  
  try {
    const imagePrompt = `Amateur smartphone photo of ${topic.toLowerCase()}, taken by ${config.business.type} business owner, slightly blurry, natural lighting, real UK ${config.business.type} work, authentic setting, consumer grade photo, imperfect composition, taken quickly, genuine documentary style, no stock photo quality, absolutely NO TEXT anywhere in image, no writing, no signs with text, no labels with words, no written words, no letters, no numbers, no typography, no captions, no watermarks, textless image only, wordless photograph, ensure completely text-free`;
    
    const response = await openai.images.generate({
      model: config.ai.imageModel || 'dall-e-2',
      prompt: imagePrompt,
      size: '512x512',
      n: 1,
    });
    
    if (response.data && response.data[0]) {
      const imageUrl = response.data[0].url;
      const timestamp = Date.now();
      const filename = `${timestamp}.png`;
      
      const imagesPath = path.join(process.cwd(), config.output.imagesPath);
      const localImagePath = await downloadImage(imageUrl, filename, imagesPath, config);
      
      if (localImagePath) {
        return {
          url: localImagePath,
          alt: `${title} - ${config.business.name} in ${config.business.location}`
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error generating image:', error);
    return null;
  }
}

function generateSlug(title, focusKeyword) {
  let slug = title.toLowerCase();
  
  if (focusKeyword) {
    const keywordSlug = focusKeyword.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!slug.includes(keywordSlug)) {
      slug = `${keywordSlug}-${slug}`;
    }
  }
  
  return slug
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

async function getExistingBlogPosts(config) {
  try {
    const postsDir = path.join(process.cwd(), config.output.postsPath);
    if (await fs.pathExists(postsDir)) {
      const files = await fs.readdir(postsDir);
      const posts = [];
      for (const file of files.filter(f => f.endsWith('.md'))) {
        const content = await fs.readFile(path.join(postsDir, file), 'utf-8');
        const titleMatch = content.match(/title:\s*"([^"]+)"/);
        const slug = file.replace('.md', '');
        if (titleMatch) {
          posts.push({
            title: titleMatch[1],
            url: `/${config.blog?.slug || 'blog'}/${slug}`,
            slug: slug
          });
        }
      }
      return posts;
    }
  } catch (error) {
    console.error('Error reading blog posts:', error);
  }
  return [];
}

async function getUsedTopics() {
  try {
    const historyPath = path.join(process.cwd(), 'topic-history.json');
    if (await fs.pathExists(historyPath)) {
      return await fs.readJson(historyPath);
    }
  } catch (error) {
    console.error('Error reading topic history:', error);
  }
  return [];
}

async function saveUsedTopic(topic) {
  try {
    const historyPath = path.join(process.cwd(), 'topic-history.json');
    const history = await getUsedTopics();
    history.push({
      topic: topic,
      date: new Date().toISOString()
    });
    await fs.writeJson(historyPath, history, { spaces: 2 });
  } catch (error) {
    console.error('Error saving topic history:', error);
  }
}

function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function getCurrentMonth() {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[new Date().getMonth()];
}

async function generateDynamicTopic(config) {
  const season = getCurrentSeason();
  const month = getCurrentMonth();
  const year = new Date().getFullYear();
  const locationName = config.business.location.split(',')[0].trim();
  
  const strategies = [
    () => `${month} ${config.business.type} tips for ${locationName} properties`,
    () => `${season} maintenance guide for ${config.business.location}`,
    () => `${year} ${config.business.type} costs in ${locationName}`,
    () => `Emergency ${config.business.type} services in ${config.business.location}`,
    () => `Eco-friendly ${config.business.type} solutions for ${locationName}`,
    () => `Common ${config.business.type} problems in ${locationName} homes`,
    () => `${config.business.type} safety guide for ${config.business.location}`,
    () => `Choosing a ${config.business.type} in ${locationName}: What to ask`,
    () => `DIY vs professional ${config.business.type} in ${config.business.location}`,
    () => `${config.business.type} regulations in ${locationName} ${year}`
  ];
  
  const strategy = strategies[Math.floor(Math.random() * strategies.length)];
  return strategy();
}

async function selectUnusedTopic(config) {
  const usedTopics = await getUsedTopics();
  const usedTopicTitles = usedTopics.map(t => t.topic);
  
  const availableTopics = config.topics.filter(t => !usedTopicTitles.includes(t));
  
  if (availableTopics.length > config.topics.length * 0.5) {
    return availableTopics[Math.floor(Math.random() * availableTopics.length)];
  }
  
  if (availableTopics.length > 0) {
    const useDynamic = Math.random() > 0.5;
    if (useDynamic) {
      return await generateDynamicTopic(config);
    } else {
      return availableTopics[Math.floor(Math.random() * availableTopics.length)];
    }
  }
  
  return await generateDynamicTopic(config);
}

async function generateBlogPost(config, openai) {
  const topic = await selectUnusedTopic(config);
  console.log(`📌 Selected topic: ${topic}`);
  
  await saveUsedTopic(topic);
  
  const existingPosts = await getExistingBlogPosts(config);
  
  const prompt = `${config.prompts.context}

Write a comprehensive, SEO-optimized blog post about: "${topic}"

${existingPosts.length > 0 ? `EXISTING BLOG POSTS for internal linking:
${existingPosts.map(p => `- "${p.title}" at ${p.url}`).join('\n')}` : ''}

Requirements:
1. Title: Create a professional, compelling title (50-70 characters)
2. Content: 1500-2000 words for better SEO ranking
3. Structure: Use ## for H2 headings, ### for H3 subheadings
4. Local SEO: Mention ${config.business.location} 3-4 times naturally
5. Include nearby areas: ${config.business.nearbyAreas.join(', ')}
6. Internal Linking: Add 3-5 internal links to ${config.business.website}
7. Human touches: Use contractions, personal observations
8. Include FAQ section with 3-5 questions
9. Meta description: 150-160 characters

Format the response as JSON with these fields:
- title: The blog post title
- excerpt: A 2-3 sentence summary
- metaDescription: SEO meta description
- focusKeyword: Main keyword to target
- secondaryKeywords: Array of 3-5 secondary keywords
- tags: Array of 5-8 relevant tags
- content: The full blog post in markdown format`;

  try {
    const response = await openai.chat.completions.create({
      model: config.ai.model,
      messages: [
        {
          role: 'system',
          content: config.prompts.system,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    const image = await generateBlogImage(topic, result.title, config, openai);
    if (image) {
      result.imageUrl = image.url;
      result.imageAlt = image.alt;
    }
    
    return result;
  } catch (error) {
    console.error('Error generating blog post:', error);
    return null;
  }
}

async function saveBlogPost(post, config) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const timestamp = Date.now();
  
  const slug = generateSlug(post.title, post.focusKeyword);
  const filename = `${year}-${month}-${day}-${slug}-${timestamp}.md`;
  
  const outputPath = path.join(process.cwd(), config.output.postsPath);
  await fs.ensureDir(outputPath);
  
  const filePath = path.join(outputPath, filename);
  
  const wordCount = post.content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);
  
  const frontmatter = {
    title: post.title,
    date: date.toISOString(),
    excerpt: post.excerpt,
    tags: post.tags,
    author: config.business.name,
    featured: false,
    readingTime: `${readingTime} min read`,
    wordCount: wordCount,
    metaDescription: post.metaDescription,
    focusKeyword: post.focusKeyword,
    secondaryKeywords: post.secondaryKeywords,
    image: post.imageUrl,
    imageAlt: post.imageAlt,
    canonicalUrl: `${config.business.website}/${config.blog?.slug || 'blog'}/${slug}`
  };
  
  const markdownContent = `---
${Object.entries(frontmatter).map(([key, value]) => {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    return `${key}:\n${value.map(v => `  - ${v}`).join('\n')}`;
  } else if (typeof value === 'boolean' || typeof value === 'number') {
    return `${key}: ${value}`;
  } else {
    const escapedValue = String(value).replace(/"/g, '\\"');
    return `${key}: "${escapedValue}"`;
  }
}).filter(Boolean).join('\n')}
---

${post.content}

## Why Choose Professional ${config.business.type} Services in ${config.business.location}?

If you're looking for reliable [${config.business.type} services in ${config.business.location}](${config.business.website}), we're here to help. Our experienced team provides professional ${config.business.type} services for homes and businesses throughout ${config.business.location} and surrounding areas.

Ready to get started? [Contact us today](${config.business.website}#contact) for a free quote!

---

*This article was written by ${config.business.name}, your local ${config.business.type} experts serving ${config.business.location} and surrounding areas.*

*Last updated: ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}*`;
  
  await fs.writeFile(filePath, markdownContent);
  console.log(`✅ Blog post saved: ${filename}`);
}

async function generate(configPath) {
  try {
    const config = require(configPath);
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const post = await generateBlogPost(config, openai);
    if (post) {
      await saveBlogPost(post, config);
      return true;
    } else {
      throw new Error('Failed to generate blog post - no content returned');
    }
  } catch (error) {
    console.error('Generation error:', error);
    throw error;
  }
}

// If called directly as a script
if (require.main === module) {
  const configPath = path.join(process.cwd(), 'blog-generator.config.js');
  
  // Check if config exists
  if (!fs.existsSync(configPath)) {
    console.error('❌ Config file not found. Run "npm run init" first.');
    process.exit(1);
  }
  
  console.log('🚀 Generating blog post...');
  
  generate(configPath)
    .then(() => {
      console.log('✨ Blog post generated successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed to generate blog post:', error.message);
      process.exit(1);
    });
}

module.exports = { generate };