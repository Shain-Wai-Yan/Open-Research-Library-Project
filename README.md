# Open Research Library

A minimalist, luxurious research intelligence platform for PhD students and researchers. Search papers across multiple sources, generate literature reviews, build knowledge graphs, and manage your research workflow.

## Features

### Core Features
- **Multi-Source Search**: Unified search across OpenAlex, Semantic Scholar, and arXiv
- **Personal Research Library**: Organize papers into collections with custom colors
- **Atomic Insights System**: Capture and link insights (concepts, methods, claims, limitations, gaps)
- **Literature Review Generator**: AI-powered synthesis of research papers
- **Citation Network Visualization**: Explore paper relationships and influence
- **Advanced Filtering**: By year, methodology, citation count, open access, and more

### Premium Design
- Minimalist luxurious aesthetic
- Sophisticated color palette with academic elegance
- Premium typography (Crimson Pro serif + Inter sans-serif)
- Responsive layouts optimized for research workflows

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **State Management**: React Hooks, localStorage (upgradeable to Supabase)
- **API Integration**: Modular client ready for 6 Python backend engines

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd open-research-library
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your backend API URL:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Backend Integration

### API Endpoints Required

Your Python backend should implement these endpoints:

#### 1. Search Papers
```
POST /api/search
Body: {
  query: string,
  filters?: {
    yearFrom?: number,
    yearTo?: number,
    methodology?: string[],
    minCitations?: number,
    openAccessOnly?: boolean
  }
}
Returns: Paper[]
```

#### 2. Get Paper Details
```
GET /api/papers/:id
Returns: Paper
```

#### 3. Get Citation Network
```
GET /api/citations/:paperId
Returns: {
  citations: Paper[],
  references: Paper[]
}
```

#### 4. Generate Topic Clusters
```
POST /api/clusters
Body: { paperIds: string[] }
Returns: TopicCluster[]
```

#### 5. Generate Literature Review
```
POST /api/review/generate
Body: {
  researchQuestion: string,
  paperIds: string[]
}
Returns: LiteratureReview
```

### Connecting Your Backend

1. The frontend uses `lib/api-client.ts` for all API calls
2. Update `NEXT_PUBLIC_API_URL` in `.env.local` with your backend URL
3. The app includes mock data for development - it automatically falls back to mocks if API calls fail
4. See TypeScript types in `lib/types.ts` for exact response formats

## Project Structure

```
├── app/                      # Next.js app directory
│   ├── dashboard/           # Main dashboard page
│   ├── search/              # Search interface
│   ├── papers/              # Paper detail pages
│   ├── collections/         # Collections management
│   ├── insights/            # Atomic insights system
│   ├── review/              # Literature review generator
│   ├── clusters/            # Topic clustering
│   ├── analytics/           # Research analytics
│   └── settings/            # App settings
├── components/              # React components
│   ├── layout/              # Layout components (sidebar, header)
│   ├── search/              # Search-related components
│   ├── papers/              # Paper display components
│   ├── collections/         # Collection management
│   ├── insights/            # Insight capture components
│   └── ui/                  # shadcn/ui components
├── lib/                     # Utilities and configuration
│   ├── api-client.ts        # API integration (CONNECT YOUR BACKEND HERE)
│   ├── types.ts             # TypeScript type definitions
│   └── utils.ts             # Utility functions
└── public/                  # Static assets
```

## Deployment

### Deploy Frontend to Vercel

1. Push your code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

2. Go to [vercel.com](https://vercel.com) and import your repository

3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL`: Your production backend URL

4. Deploy! Vercel will automatically build and deploy your app

### Deploy Backend (Python)

Recommended services for your 6 Python engines:
- **Railway.app**: Free tier with 500 hours/month
- **Render.com**: Free tier available
- **Fly.io**: Free tier for small apps
- **Heroku**: Paid plans available

After deploying your backend, update `NEXT_PUBLIC_API_URL` in Vercel environment variables.

## Development vs Production

### Development Mode
- Uses mock data when API calls fail
- Logs errors to console with `[v0]` prefix
- localStorage for user data (collections, notes, insights)

### Production Mode
- Connects to real Python backend APIs
- Errors are handled gracefully with user-friendly messages
- Can upgrade to Supabase for cloud storage (optional)

## Customization

### Colors & Design
Edit `app/globals.css` to customize the design tokens:
- `--primary`: Main brand color
- `--background`: Page background
- `--foreground`: Text color
- Collection colors: gold, emerald, sapphire, ruby, amethyst

### API Configuration
Edit `lib/api-client.ts` to modify API endpoints or add new features.

## Free Hosting

This project is optimized for free hosting:
- **Vercel** (frontend): Unlimited projects on free tier
- **Railway/Render** (backend): Free tier with limits
- **localStorage** (data): Free, browser-based storage
- **Optional Supabase**: 500MB database free tier

## Support

For issues or questions:
1. Check the code comments in `lib/api-client.ts` for backend integration
2. Review TypeScript types in `lib/types.ts` for data structures
3. Check console logs (prefixed with `[v0]`) for debugging

## License

MIT License - feel free to use for your research projects!

---

Built with love for researchers worldwide. Happy researching! 📚✨
