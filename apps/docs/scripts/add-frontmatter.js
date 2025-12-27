const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const docsDir = path.join(process.cwd(), 'contents/docs');

function addFrontmatter(dir) {
    if (!fs.existsSync(dir)) {
        console.log(`Directory not found: ${dir}`);
        return;
    }
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            addFrontmatter(filePath);
        } else if (file.endsWith('.mdx')) {
            const content = fs.readFileSync(filePath, 'utf8');
            const { data, content: markdownBody } = matter(content);

            // Extract h1 title if no title in frontmatter
            let title = data.title;
            let newMarkdownBody = markdownBody;

            if (!title) {
                const titleMatch = markdownBody.match(/^#\s+(.+)$/m);
                if (titleMatch) {
                    title = titleMatch[1];
                    // Remove the h1 from the body since we put it in frontmatter
                    newMarkdownBody = markdownBody.replace(/^#\s+.+\n/, '').trim();
                } else {
                    // Fallback to filename
                    const parts = path.parse(file).name.split('-');
                    title = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
                }
            }

            // Add description if missing
            const description = data.description || `Documentation for ${title}`;

            const newContent = matter.stringify(newMarkdownBody, {
                title,
                description,
                ...data
            });

            fs.writeFileSync(filePath, newContent);
            console.log(`Updated ${filePath}`);
        }
    });
}

addFrontmatter(docsDir);
