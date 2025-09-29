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
    const imagePrompt = `Amateur smartphone photo showing ${topic.toLowerCase()}, taken by ${config.business.type} business owner, slightly blurry, natural lighting, real UK ${config.business.type} work, authentic setting, consumer grade photo, imperfect composition, taken quickly, genuine documentary style, no stock photo quality. CRITICAL: Absolutely NO text, NO writing, NO letters, NO words, NO numbers, NO signs, NO labels, NO captions, NO logos with text, NO banners, NO posters with text, NO computer screens with text, NO books with visible titles, NO newspapers, NO documents, NO packaging with text, NO street signs, NO shop names, NO watermarks, NO typography of any kind. Generate a completely text-free, wordless photograph. Focus on visual elements only without ANY readable characters or symbols.`;
    
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
        const slug = file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace('.md', '').replace(/-\d+$/, '');
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

async function getAllSitemapPages(config) {
  const baseUrl = config.business.website;
  
  // Core service and informational pages
  const sitemapPages = [
    {
      title: 'Web Design Yeovil - Professional Website Development',
      url: baseUrl,
      anchorTexts: [
        'web design Yeovil',
        'website design in Yeovil',
        'Yeovil web design services',
        'professional web design Yeovil',
        'web designers in Yeovil'
      ]
    },
    {
      title: 'Our Services - Web Design, SEO & App Development',
      url: `${baseUrl}/services`,
      anchorTexts: [
        'our services',
        'web development services',
        'SEO and web design services',
        'digital marketing services'
      ]
    },
    {
      title: 'Portfolio - Our Web Design Work',
      url: `${baseUrl}/portfolio`,
      anchorTexts: [
        'our portfolio',
        'web design portfolio',
        'see our work',
        'client projects'
      ]
    },
    {
      title: 'Blog - Digital Marketing Insights',
      url: `${baseUrl}/blogs`,
      anchorTexts: [
        'our blog',
        'digital marketing blog',
        'web design insights',
        'SEO tips and advice'
      ]
    },
    {
      title: 'Frequently Asked Questions',
      url: `${baseUrl}/faq`,
      anchorTexts: [
        'frequently asked questions',
        'FAQs',
        'common questions',
        'learn more'
      ]
    },
    {
      title: 'Contact Us',
      url: `${baseUrl}/#contact`,
      anchorTexts: [
        'contact us',
        'get in touch',
        'request a quote',
        'speak to our team'
      ]
    }
  ];
  
  return sitemapPages;
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

async function generateDynamicTopic(config, openai) {
  const season = getCurrentSeason();
  const month = getCurrentMonth();
  const year = new Date().getFullYear();
  const locationName = config.business.location.split(',')[0].trim();
  
  // Get recently used topics to avoid repetition
  const recentTopics = await getUsedTopics();
  const lastMonth = recentTopics.slice(-30).map(t => t.topic).join(', ');
  
  const prompt = `Generate a compelling blog topic for ${config.business.name}, a ${config.business.type} company in ${config.business.location}.

Context:
- Current month: ${month} ${year}
- Season: ${season}
- Location: ${locationName}, Somerset, UK
- Target audience: Business owners and decision-makers who need professional web/SEO services

Recent topics to AVOID (don't repeat these):
${lastMonth || 'None'}

Requirements for the new topic:
1. Must be relevant to current trends in web design, SEO, or digital marketing
2. Should consider seasonal factors (e.g., Christmas shopping, new financial year, summer tourism)
3. Must appeal to business owners who NEED services (not DIY)
4. Should incorporate local ${locationName}/Somerset angle
5. Must be specific and actionable, not generic
6. Consider current events, technology trends, or regulatory changes in 2024/2025
7. Topic should educate about problems/opportunities, positioning professional help as the solution

Examples of good topic formats:
- "Why [current trend] matters for [location] businesses"
- "[Problem] costing [location] companies [impact]"
- "How [technology/regulation] affects [location] [industry]"
- "[Season/Event] preparation for [location] websites"

Generate ONE specific, timely topic title (50-80 characters). Focus on current relevance and local impact.`;

  try {
    const response = await openai.chat.completions.create({
      model: config.ai.model,
      messages: [
        {
          role: 'system',
          content: 'You are a content strategist who generates timely, relevant blog topics for a web design and SEO company. Return only the topic title, nothing else.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      // Note: gpt-5-nano doesn't support custom temperature or max_tokens
      max_completion_tokens: 100
    });
    
    const topic = response.choices[0].message.content.trim().replace(/["']/g, '');
    
    // Ensure we have a valid topic
    if (!topic || topic.length < 10) {
      throw new Error('Generated topic is too short or empty');
    }
    
    return topic;
  } catch (error) {
    console.error('Error generating dynamic topic:', error);
    // Fallback to basic generation with better topics
    const fallbacks = [
      `Why ${locationName} businesses need professional web design in ${year}`,
      `${season} digital marketing strategies for Somerset businesses`,
      `Website security essentials for ${locationName} companies`,
      `How AI is transforming web design for ${locationName} SMEs`,
      `Mobile-first design: Essential for ${locationName} businesses`,
      `Local SEO strategies that work for ${locationName} companies`,
      `E-commerce opportunities for Somerset retailers in ${year}`,
      `Professional web design ROI for ${locationName} businesses`
    ];
    const fallbackTopic = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    console.log(`Using fallback topic: ${fallbackTopic}`);
    return fallbackTopic;
  }
}

async function selectUnusedTopic(config, openai) {
  const usedTopics = await getUsedTopics();
  const usedTopicTitles = usedTopics.map(t => t.topic);
  
  // Check if we should use AI generation
  const useAIGeneration = config.ai?.alwaysGenerateTopics || false;
  
  if (useAIGeneration) {
    // Always use AI to generate fresh, timely topics
    return await generateDynamicTopic(config, openai);
  }
  
  // Original behavior: use predefined topics first, then AI
  const availableTopics = config.topics ? config.topics.filter(t => !usedTopicTitles.includes(t)) : [];
  
  if (availableTopics.length > config.topics.length * 0.5) {
    return availableTopics[Math.floor(Math.random() * availableTopics.length)];
  }
  
  if (availableTopics.length > 0) {
    const useDynamic = Math.random() > 0.5;
    if (useDynamic) {
      return await generateDynamicTopic(config, openai);
    } else {
      return availableTopics[Math.floor(Math.random() * availableTopics.length)];
    }
  }
  
  return await generateDynamicTopic(config, openai);
}

async function generateBlogPost(config, openai) {
  const topic = await selectUnusedTopic(config, openai);
  console.log(`📌 Selected topic: ${topic}`);
  
  await saveUsedTopic(topic);
  
  const existingPosts = await getExistingBlogPosts(config);
  const sitemapPages = await getAllSitemapPages(config);
  
  const prompt = `${config.prompts.context}

Write a comprehensive, SEO-optimized blog post about: "${topic}"

CRITICAL INTERNAL LINKING REQUIREMENTS:
You MUST include internal links to our main pages, especially the homepage with "web design Yeovil" variations as anchor text.

SITEMAP PAGES (Use these for internal linking with varied anchor text):
${sitemapPages.map(page => `- ${page.title}
  URL: ${page.url}
  Suggested anchor texts: ${page.anchorTexts.join(', ')}`).join('\n')}

IMPORTANT HOMEPAGE LINKING: 
- Link to the homepage (${config.business.website}) at least 2-3 times
- Use these keyword variations as anchor text: ${config.business.keywordVariations ? config.business.keywordVariations.join(', ') : '"web design Yeovil", "website design in Yeovil", "Yeovil web designers"'}
- Make the links natural and contextual within sentences
- Examples:
  * "As a leading [web design agency in Yeovil](${config.business.website}), we understand..."
  * "Our [Yeovil web design services](${config.business.website}) focus on..."
  * "When choosing [professional web design in Yeovil](${config.business.website})..."

${existingPosts.length > 0 ? `RECENT BLOG POSTS for internal linking:
${existingPosts.slice(-10).map(p => `- "${p.title}" at ${p.url}`).join('\n')}` : ''}

SEO & CONTENT REQUIREMENTS:
1. Title: Compelling, emotional title with power words (50-70 characters)
2. Content Length: 1,800-2,500 words (optimal for ranking)
3. Keyword Density: Use focus keyword 0.5-1% naturally throughout
4. Structure: 
   - Hook opening (address pain point immediately)
   - Clear H2 sections (3-5 main sections)
   - H3 subsections for detailed points
   - Include a comparison table or bullet list
5. Local SEO: 
   - Mention ${config.business.location} 4-6 times naturally
   - Reference nearby: ${config.business.nearbyAreas.join(', ')}
   - Include local landmarks or businesses as examples
6. Internal Linking: 
   - Add 5-8 contextual internal links total
   - MUST include 2-3 links to homepage with "web design Yeovil" variations
   - Include 1-2 links to /services page
   - Include 1-2 links to recent blog posts
   - Use natural, varied anchor text
7. External Authority: Reference 2-3 industry stats with years

CRITICAL WRITING INSTRUCTIONS TO AVOID AI DETECTION:
- NEVER use labels like "Hook:", "H2:", "H3:" - just write the content naturally
- Use ## for main headers and ### for subheaders in markdown (no labels!)
- Properly capitalize headers like normal titles (e.g., "Why Security Matters" not "why security matters")
- Start paragraphs conversationally, like you're talking to a friend
- Use lots of contractions (we're, it's, don't, won't, you'll, that's)
- Start many sentences with And, But, So, Because, Now, Look
- Include personal anecdotes: "Just yesterday...", "I remember when...", "We had a client who..."
- Add thinking words: "I reckon", "Honestly", "Truth is", "Let me tell you"
- Use filler phrases: "you know", "sort of", "kind of", "basically"
- Include minor typos that get corrected naturally
- Break grammar rules: end with prepositions, use fragments
- Add local colloquialisms and British slang occasionally
- Use specific odd numbers: £2,347 not £2,000, 73% not 70%, 18 minutes not 20
- Include parenthetical thoughts (like this one - see what I mean?)
- Reference specific days: "Last Tuesday", "This morning", "Yesterday afternoon"
- Add sensory details: what things look, sound, smell like
- Include minor contradictions or self-corrections
- Use informal language: "stuff", "things", "loads of", "a bit"

ADVANCED SEO ELEMENTS:
8. FAQ Section: 5-7 questions in "People Also Ask" format
9. LSI Keywords: Include semantic variations naturally
10. Featured Snippet Optimization: One section with direct answer format
11. Voice Search: Include conversational long-tail phrases
12. Schema-Ready Content: Include specific data points for rich snippets
13. E-A-T Signals: Mention years of experience, specific case results
14. Meta Description: Under 155 characters with call-to-action
15. Power Words: Use emotional triggers in headings

Format the response as JSON with these fields:
- title: The blog post title (with power word)
- excerpt: A 2-3 sentence summary that creates urgency
- metaDescription: SEO meta description with CTA
- focusKeyword: Main keyword to target
- secondaryKeywords: Array of 5-7 LSI keywords
- tags: Array of 8-10 specific tags
- content: The full blog post in markdown
- schema: Suggested schema markup type (Article, HowTo, FAQ, etc.)`;

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
      // Note: gpt-5-nano only supports default temperature (1.0)
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
    canonicalUrl: `${config.business.website}/${config.blog?.slug || 'blog'}/${slug}`,
    schemaType: post.schema || 'Article'
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