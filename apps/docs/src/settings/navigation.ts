import { PageRoutes } from "@/lib/pageroutes"

export const Navigations = [
  {
    title: "Docs",
    href: `/docs${PageRoutes[0].href}`,
  },
  {
    title: "npm",
    href: "https://www.npmjs.com/package/@cosmneo/onion-lasagna",
    external: true,
  },
]

export const GitHubLink = {
  href: "https://github.com/Cosmneo/onion-lasagna",
}
