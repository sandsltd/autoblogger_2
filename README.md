# SEO Blog Generator

Automated SEO-optimized blog generation for local businesses using AI. Generate high-quality, locally-focused content that ranks well in search engines while maintaining a natural, human writing style.

## Features

- 🤖 AI-powered content generation using OpenAI GPT models
- 🎨 Automatic image generation with DALL-E
- 🎯 SEO optimization with meta descriptions, keywords, and structured data
- 📍 Local SEO focus with area-specific content
- 🔄 Automatic topic management and rotation
- ⏰ Scheduled generation with cron support
- 🏢 Multiple business type templates
- 💂 British English support
- 🚫 AI detection avoidance techniques

## Quick Start

### Installation

```bash
npm install -g seo-blog-generator
```

Or install locally in your project:

```bash
npm install seo-blog-generator
```

### Setup

Run the interactive setup wizard:

```bash
blog-generator init
```

This will guide you through:
- Business information (name, type, location)
- OpenAI API configuration
- Output directories
- Generation schedule

### Generate Your First Post

```bash
blog-generator generate
```

## Commands

```bash
blog-generator init      # Interactive setup wizard
blog-generator generate  # Generate a single blog post
blog-generator schedule  # Start scheduled generation
blog-generator stats     # View generation statistics
blog-generator reset     # Reset topic history
blog-generator --help    # Show all commands
```

## Business Types Supported

- Window Cleaner
- Plumber
- Electrician
- Gardener/Landscaper
- Roofer
- Painter/Decorator
- House Cleaner
- Builder/Construction
- Carpenter/Joiner
- Locksmith
- Other (custom)

Each business type comes with pre-configured topic templates that are automatically customized for your location.

## Configuration

After running `blog-generator init`, a `blog-generator.config.js` file will be created with your settings:

```javascript
module.exports = {
  business: {
    name: "Your Business Name",
    type: "plumber",
    location: "York, Yorkshire",
    nearbyAreas: ["Leeds", "Harrogate", "Selby"],
    website: "https://yourbusiness.com"
  },
  ai: {
    model: "gpt-5-nano-2025-08-07",
    generateImages: true,
    imageModel: "dall-e-2"
  },
  output: {
    postsPath: "./content/posts",
    imagesPath: "./public/images/blog"
  },
  schedule: {
    cron: "0 */3 * * *" // Every 3 hours
  },
  topics: [
    // Auto-generated based on business type
  ]
};
```

## Environment Variables

Create a `.env` file in your project root:

```
OPENAI_API_KEY=your_openai_api_key_here
```

## Scheduling Options

- **Every hour**: `0 * * * *`
- **Every 3 hours**: `0 */3 * * *`
- **Every 6 hours**: `0 */6 * * *`
- **Daily at 9am**: `0 9 * * *`
- **Twice daily**: `0 9,15 * * *`
- **Manual only**: Generate posts on demand

## Output Format

Posts are generated as Markdown files with frontmatter:

```markdown
---
title: "Professional Window Cleaning Tips for York Homes"
date: "2024-01-15T10:30:00.000Z"
excerpt: "Discover expert window cleaning techniques..."
tags:
  - window cleaning
  - York
  - professional tips
metaDescription: "Expert window cleaning tips for York properties..."
focusKeyword: "window cleaning York"
---

## Your Blog Content Here

Professional, SEO-optimized content with local focus...
```

## Integration with Your Website

### Next.js/React

```javascript
import { readFileSync, readdirSync } from 'fs';
import matter from 'gray-matter';

export function getBlogPosts() {
  const files = readdirSync('./content/posts');
  return files.map(filename => {
    const fileContent = readFileSync(`./content/posts/${filename}`, 'utf-8');
    const { data, content } = matter(fileContent);
    return { ...data, content, slug: filename.replace('.md', '') };
  });
}
```

### Static Site Generators

The generated markdown files are compatible with:
- Gatsby
- Hugo
- Jekyll
- Eleventy
- Next.js
- Nuxt

## GitHub Actions Integration

Create `.github/workflows/blog-generation.yml`:

```yaml
name: Generate Blog Post

on:
  schedule:
    - cron: '0 */3 * * *'
  workflow_dispatch:

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm install seo-blog-generator
      
      - name: Generate Blog Post
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: npx blog-generator generate
      
      - name: Commit and Push
        run: |
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add content/posts/* public/images/blog/*
          git diff --staged --quiet || git commit -m "Add new blog post [automated]"
          git push
```

## Tips for Best Results

1. **Local Focus**: Always include your location in the business setup
2. **Nearby Areas**: List 3-5 nearby towns/cities you serve
3. **Regular Generation**: Post consistently for better SEO results
4. **Image Generation**: Enable images for better engagement
5. **Topic Variety**: Let the system rotate through topics automatically

## Troubleshooting

### No posts being generated
- Check your OpenAI API key is valid
- Ensure output directories exist and are writable
- Check the console for error messages

### Images not appearing
- Verify DALL-E access on your OpenAI account
- Check image directory permissions
- Ensure `generateImages: true` in config

### Duplicate topics
- Run `blog-generator reset` to clear history
- Check `topic-history.json` for issues

## License

MIT

## Support

For issues or questions, please visit the [GitHub repository](https://github.com/sandsltd/autoblogger_2).