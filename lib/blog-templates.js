const templates = {
  nextjs: {
    page: (slug, config) => `import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${config.business.name} Blog - ${config.business.type} Insights',
  description: 'Expert ${config.business.type} advice and insights from ${config.business.name} in ${config.business.location}.',
};

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  image?: string;
  readingTime?: string;
  tags?: string[];
}

async function getBlogPosts(): Promise<BlogPost[]> {
  const postsDirectory = path.join(process.cwd(), '.blog-generator/content/posts');
  
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }
  
  const fileNames = fs.readdirSync(postsDirectory);
  
  const posts = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => {
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);
      
      return {
        slug: fileName.replace(/\\.md$/, ''),
        title: data.title || 'Untitled',
        date: data.date || new Date().toISOString(),
        excerpt: data.excerpt || '',
        image: data.image,
        readingTime: data.readingTime,
        tags: data.tags || []
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return posts;
}

export default async function BlogPage() {
  const posts = await getBlogPosts();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">${config.business.name} Blog</h1>
      <p className="text-lg text-gray-600 mb-12">
        Expert ${config.business.type} advice and tips for ${config.business.location}
      </p>
      
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts.length === 0 ? (
          <p className="text-gray-600 col-span-full">No blog posts yet. Check back soon!</p>
        ) : (
          posts.map((post) => (
            <article key={post.slug} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              {post.image && (
                <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100">
                  <img 
                    src={post.image} 
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <h2 className="text-xl font-bold mb-3">
                  <Link href={\`/${slug}/\${post.slug}\`} className="text-gray-900 hover:text-blue-600 transition-colors">
                    {post.title}
                  </Link>
                </h2>
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>{new Date(post.date).toLocaleDateString('en-GB')}</span>
                  {post.readingTime && <span>{post.readingTime}</span>}
                </div>
                {post.tags && post.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span 
                        key={tag}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}`
  },
  
  gatsby: {
    page: (slug, config) => `import React from "react"
import { graphql, Link } from "gatsby"
import Layout from "../components/layout"
import SEO from "../components/seo"

const BlogPage = ({ data }) => {
  const posts = data.allMarkdownRemark.edges
  
  return (
    <Layout>
      <SEO title="Blog" />
      <div className="container">
        <h1>${config.business.name} Blog</h1>
        <p>Expert ${config.business.type} advice and tips for ${config.business.location}</p>
        
        <div className="blog-grid">
          {posts.map(({ node }) => (
            <article key={node.fields.slug}>
              {node.frontmatter.image && (
                <img src={node.frontmatter.image} alt={node.frontmatter.title} />
              )}
              <h2>
                <Link to={node.fields.slug}>{node.frontmatter.title}</Link>
              </h2>
              <p>{node.frontmatter.excerpt}</p>
              <span>{node.frontmatter.date}</span>
            </article>
          ))}
        </div>
      </div>
    </Layout>
  )
}

export const query = graphql\`
  query {
    allMarkdownRemark(
      sort: { fields: [frontmatter___date], order: DESC }
      filter: { fileAbsolutePath: { regex: "/content/posts/" } }
    ) {
      edges {
        node {
          fields {
            slug
          }
          frontmatter {
            title
            date(formatString: "MMMM DD, YYYY")
            excerpt
            image
          }
        }
      }
    }
  }
\`

export default BlogPage`
  },
  
  nuxt: {
    page: (slug, config) => `<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-4xl font-bold mb-8">${config.business.name} Blog</h1>
    <p class="text-lg text-gray-600 mb-12">
      Expert ${config.business.type} advice and tips for ${config.business.location}
    </p>
    
    <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      <article v-for="post in posts" :key="post.slug" class="border rounded-lg p-6">
        <img 
          v-if="post.image" 
          :src="post.image" 
          :alt="post.imageAlt || post.title"
          class="w-full h-48 object-cover rounded mb-4"
        />
        <h2 class="text-2xl font-semibold mb-2">
          <NuxtLink :to="\`/${slug}/\${post.slug}\`" class="hover:text-blue-600">
            {{ post.title }}
          </NuxtLink>
        </h2>
        <p class="text-gray-600 mb-4">{{ post.excerpt }}</p>
        <div class="flex justify-between items-center text-sm text-gray-500">
          <span>{{ formatDate(post.date) }}</span>
          <span>{{ post.readingTime }}</span>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
const { data: posts } = await useAsyncData('blog-posts', () => 
  queryContent('/posts').sort({ date: -1 }).find()
)

function formatDate(date) {
  return new Date(date).toLocaleDateString()
}
</script>`
  },
  
  sveltekit: {
    page: (slug, config) => `<script>
  export let data;
</script>

<div class="container">
  <h1>${config.business.name} Blog</h1>
  <p>Expert ${config.business.type} advice and tips for ${config.business.location}</p>
  
  <div class="blog-grid">
    {#each data.posts as post}
      <article>
        {#if post.image}
          <img src={post.image} alt={post.title} />
        {/if}
        <h2>
          <a href="/${slug}/{post.slug}">{post.title}</a>
        </h2>
        <p>{post.excerpt}</p>
        <span>{new Date(post.date).toLocaleDateString()}</span>
      </article>
    {/each}
  </div>
</div>`,
    loader: () => `import { getBlogPosts } from '$lib/blog.js';

export async function load() {
  const posts = await getBlogPosts();
  
  return {
    posts
  };
}`
  },
  
  static: {
    page: (slug, config) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.business.name} Blog - ${config.business.type} in ${config.business.location}</title>
  <meta name="description" content="Expert ${config.business.type} advice and tips for ${config.business.location}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    .subtitle { font-size: 1.2rem; color: #666; margin-bottom: 3rem; }
    .blog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2rem; }
    article { border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; transition: box-shadow 0.3s; }
    article:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    article img { width: 100%; height: 200px; object-fit: cover; border-radius: 4px; margin-bottom: 1rem; }
    article h2 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    article h2 a { color: #333; text-decoration: none; }
    article h2 a:hover { color: #0066cc; }
    article p { color: #666; margin-bottom: 1rem; }
    .meta { display: flex; justify-content: space-between; font-size: 0.9rem; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${config.business.name} Blog</h1>
    <p class="subtitle">Expert ${config.business.type} advice and tips for ${config.business.location}</p>
    
    <div class="blog-grid" id="blog-posts">
      <!-- Posts will be loaded here -->
    </div>
  </div>
  
  <script>
    async function loadPosts() {
      try {
        // This assumes you'll have an API endpoint or JSON file with posts
        const response = await fetch('/api/posts');
        const posts = await response.json();
        
        const container = document.getElementById('blog-posts');
        container.innerHTML = posts.map(post => \`
          <article>
            \${post.image ? \`<img src="\${post.image}" alt="\${post.title}">\` : ''}
            <h2><a href="/${slug}/\${post.slug}">\${post.title}</a></h2>
            <p>\${post.excerpt}</p>
            <div class="meta">
              <span>\${new Date(post.date).toLocaleDateString()}</span>
              <span>\${post.readingTime}</span>
            </div>
          </article>
        \`).join('');
      } catch (error) {
        console.error('Failed to load posts:', error);
      }
    }
    
    loadPosts();
  </script>
</body>
</html>`
  }
};

module.exports = { templates };