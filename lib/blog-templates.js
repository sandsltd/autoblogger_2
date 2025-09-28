const templates = {
  nextjs: {
    page: (slug, config) => `import { getBlogPosts } from '@/lib/blog';
import Link from 'next/link';

export default function BlogPage() {
  const posts = getBlogPosts();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">${config.business.name} Blog</h1>
      <p className="text-lg text-gray-600 mb-12">
        Expert ${config.business.type} advice and tips for ${config.business.location}
      </p>
      
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <article key={post.slug} className="border rounded-lg p-6 hover:shadow-lg transition">
            {post.image && (
              <img 
                src={post.image} 
                alt={post.imageAlt || post.title}
                className="w-full h-48 object-cover rounded mb-4"
              />
            )}
            <h2 className="text-2xl font-semibold mb-2">
              <Link href={\`/${slug}/\${post.slug}\`} className="hover:text-blue-600">
                {post.title}
              </Link>
            </h2>
            <p className="text-gray-600 mb-4">{post.excerpt}</p>
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>{new Date(post.date).toLocaleDateString()}</span>
              <span>{post.readingTime}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}`,
    lib: () => `import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export function getBlogPosts() {
  const postsDirectory = path.join(process.cwd(), 'content/posts');
  
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }
  
  const fileNames = fs.readdirSync(postsDirectory);
  
  const posts = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => {
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);
      
      return {
        slug: fileName.replace(/\\.md$/, ''),
        content,
        ...data
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return posts;
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