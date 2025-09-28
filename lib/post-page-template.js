const postPageTemplates = {
  nextjs: (slug, config) => `import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  
  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }
  
  return {
    title: post.title,
    description: post.excerpt || post.metaDescription,
    keywords: post.focusKeyword,
  };
}

async function getBlogPost(slug: string) {
  const postsDirectory = path.join(process.cwd(), '.blog-generator/content/posts');
  const fullPath = path.join(postsDirectory, \`\${slug}.md\`);
  
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);
  
  return {
    ...data,
    content,
  };
}

function formatContent(content: string): string {
  // Convert markdown to HTML (basic conversion)
  let html = content;
  
  // Convert headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>');
  
  // Convert bold and italic
  html = html.replace(/\\*\\*\\*(.+?)\\*\\*\\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
  html = html.replace(/\\*(.+?)\\*/g, '<em>$1</em>');
  
  // Convert lists
  html = html.replace(/^\\* (.+)/gim, '<li class="ml-4">• $1</li>');
  html = html.replace(/^\\d+\\. (.+)/gim, '<li class="ml-4">$1</li>');
  
  // Convert links
  html = html.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" class="text-blue-600 hover:underline">$1</a>');
  
  // Convert paragraphs
  html = html.split('\\n\\n').map(para => {
    if (para.trim() && !para.includes('<h') && !para.includes('<li')) {
      return \`<p class="mb-4">\${para}</p>\`;
    }
    return para;
  }).join('\\n');
  
  return html;
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  
  if (!post) {
    notFound();
  }
  
  const formattedContent = formatContent(post.content);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <article className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {post.title}
          </h1>
          
          <div className="flex items-center gap-4 text-gray-600">
            <span>{new Date(post.date).toLocaleDateString('en-GB', { 
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}</span>
            {post.readingTime && (
              <>
                <span>•</span>
                <span>{post.readingTime}</span>
              </>
            )}
            {post.author && (
              <>
                <span>•</span>
                <span>{post.author}</span>
              </>
            )}
          </div>
          
          {post.tags && post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag: string) => (
                <span 
                  key={tag}
                  className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>
        
        {/* Featured Image */}
        {post.image && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <img 
              src={post.image} 
              alt={post.imageAlt || post.title}
              className="w-full h-auto"
            />
          </div>
        )}
        
        {/* Content */}
        <div 
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: formattedContent }}
        />
        
        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200">
          <div className="bg-blue-50 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-3">Need ${config.business.type} Services?</h3>
            <p className="text-gray-700 mb-4">
              ${config.business.name} specializes in ${config.business.type} services 
              for businesses and residents in ${config.business.location} and surrounding areas.
            </p>
            <a 
              href="${config.business.website}"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Get in Touch
            </a>
          </div>
        </footer>
      </article>
    </div>
  );
}`
};

module.exports = { postPageTemplates };