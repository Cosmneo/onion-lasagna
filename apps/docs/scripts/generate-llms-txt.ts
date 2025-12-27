import { promises as fs } from "fs"
import path from "path"
import { Documents } from "@/settings/documents" // Use alias if tsconfig-paths works, otherwise relative
import grayMatter from "gray-matter"
import { Paths } from "@/lib/pageroutes"

// Helper types - replicating from content.ts or importing if possible
// Ideally we duplicate minimally to avoid complex refactors of working scripts

const docsDir = path.join(process.cwd(), "contents/docs")
const outputDir = path.join(process.cwd(), "public")

interface MdxJsxFlowElement {
  name: string
  children?: any[]
}

// Reuse clean logic
function cleanContent(content: string): string {
  let cleanedContent = content

  // Remove frontmatter if passed raw, but we parse it via grayMatter
  // ... basic cleanup

  cleanedContent = cleanedContent.replace(/```[\s\S]*?```/g, (match) => {
    // Keep code blocks but maybe strip fences? or keep them for LLM readability?
    // LLMs usually LIKE code blocks. content.ts stripped them for search index. 
    // For LLMs.txt, we WANT code.
    return match
  })
  
  // Strip import/export statements
  cleanedContent = cleanedContent.replace(/^import\s+.*$/gm, "")
  cleanedContent = cleanedContent.replace(/^export\s+.*$/gm, "")

  // Strip component tags <Tabs> etc but keep content if possible?
  // Simply stripping tags might leave loose content. 
  // For now, let's keep it simple: stripped of complex components.

  cleanedContent = cleanedContent.replace(
    /<(?:Note|Card|Step|FileTree|Folder|File|Mermaid)[^>]*>([\s\S]*?)<\/(?:Note|Card|Step|FileTree|Folder|File|Mermaid)>/g,
    "$1"
  )
  
  // Remove other tags
  cleanedContent = cleanedContent.replace(/<[^>]+>/g, "")

  return cleanedContent.trim()
}

async function getMdxFiles(dir: string): Promise<string[]> {
  let files: string[] = []
  const items = await fs.readdir(dir, { withFileTypes: true })

  for (const item of items) {
    const fullPath = path.join(dir, item.name)
    if (item.isDirectory()) {
      const subFiles = await getMdxFiles(fullPath)
      files = files.concat(subFiles)
    } else if (item.name.endsWith(".mdx")) {
      files.push(fullPath)
    }
  }
  return files
}

async function processMdxFile(filePath: string) {
  const rawMdx = await fs.readFile(filePath, "utf-8")
  const { content, data: frontmatter } = grayMatter(rawMdx)
  const title = frontmatter.title || path.basename(filePath, ".mdx")
  
  const cleaned = cleanContent(content)
  
  return `
# ${title}
${frontmatter.description ? `> ${frontmatter.description}\n` : ""}
${cleaned}
---
`
}

async function generate() {
  console.log("Generating public/llms.txt...")
  try {
    // Strategy: Use Documents list to order them? 
    // Or just grab all? 
    // Using Documents ensures correct order (Introduction -> Layers -> Patterns).
    
    // Flatten Documents to get order
    const orderedPaths: string[] = []
    function traverse(items: Paths[]) {
        for (const item of items) {
            if ("href" in item && item.href && !item.external) {
                // Href is like /layers/overview
                // Convert to path: contents/docs/layers/overview.mdx
                // Handle root / -> index.mdx
                let p = item.href
                if (p === "") p = "/index" // Root introduction
                
                // Construct physical path
                const relative = p.startsWith("/") ? p.slice(1) : p
                const possiblePath = path.join(docsDir, `${relative}.mdx`)
                orderedPaths.push(possiblePath)
            }
            if ("items" in item && item.items) {
                traverse(item.items)
            }
        }
    }
    
    // Documents is imported from src/settings/documents via text/import
    // But since this is a script, consuming TS source directly via tsx works
    traverse(Documents)

    // Also need to handle duplicate files if multiple routes point to same file?
    // Unlikely in this project.
    
    let fullText = "# Onion Lasagna Architecture Documentation\n\n"
    
    // Use a Set to avoid processing same file twice
    const processedFiles = new Set<string>()

    for (const filePath of orderedPaths) {
        // file path might be mismatched if Documents href doesn't match file exactly?
        // E.g. href="" -> /index.mdx
        // Let's verify existence
        let target = filePath
        try {
            await fs.access(target)
        } catch {
            // Try /index.mdx if folder? 
            // e.g. /layers/presentation -> layers/presentation.mdx
            // If not found, skip or warn
            console.warn(`File not found for generation: ${target}`)
            continue
        }

        if (processedFiles.has(target)) continue
        processedFiles.add(target)

        const text = await processMdxFile(target)
        fullText += text
    }

    await fs.writeFile(path.join(outputDir, "llms.txt"), fullText)
    console.log("Successfully generated public/llms.txt")
  } catch (err) {
    console.error("Error generating llms.txt:", err)
    process.exit(1)
  }
}

generate()
