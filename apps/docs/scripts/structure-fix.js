const fs = require('fs');
const path = require('path');

const docsDir = path.join(process.cwd(), 'contents/docs');

function restructureFiles(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);

    items.forEach(item => {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
            restructureFiles(itemPath);
        } else if (item.endsWith('.mdx') && item !== 'index.mdx') {
            const nameWithoutExt = path.basename(item, '.mdx');
            const newDir = path.join(dir, nameWithoutExt);
            const newPath = path.join(newDir, 'index.mdx');

            if (!fs.existsSync(newDir)) {
                fs.mkdirSync(newDir);
            }

            fs.renameSync(itemPath, newPath);
            console.log(`Moved ${itemPath} -> ${newPath}`);
        }
    });
}

restructureFiles(docsDir);
