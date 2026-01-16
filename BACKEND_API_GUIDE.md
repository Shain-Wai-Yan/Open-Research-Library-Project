# Backend API Integration Guide

This document explains exactly what your 6 Python backend engines need to return for the frontend to work perfectly.

## Overview

The frontend calls your backend via REST APIs. Each endpoint is defined in `lib/api-client.ts`. Your Python services should return JSON matching these TypeScript types.

## Environment Configuration

```bash
# Frontend calls this URL
NEXT_PUBLIC_API_URL=http://localhost:5000  # Development
NEXT_PUBLIC_API_URL=https://your-api.railway.app  # Production
```

## API Endpoints

### 1. Search Papers

**Endpoint**: `POST /api/search`

**Request Body**:
```json
{
  "query": "artificial intelligence customer experience",
  "filters": {
    "yearFrom": 2020,
    "yearTo": 2024,
    "methodology": ["experiment", "systematic-review"],
    "minCitations": 10,
    "openAccessOnly": true,
    "sources": ["openalex", "semantic-scholar", "arxiv"]
  }
}
```

**Response** (Array of Paper objects):
```json
[
  {
    "id": "unique-paper-id",
    "title": "Paper Title Here",
    "authors": [
      {
        "id": "author-id",
        "name": "Author Name",
        "affiliations": ["University Name"],
        "hIndex": 25
      }
    ],
    "abstract": "Full abstract text...",
    "publicationDate": "2024-03-15",
    "venue": "Journal Name",
    "citationCount": 47,
    "referenceCount": 82,
    "fieldsOfStudy": ["Marketing", "AI"],
    "pdfUrl": "https://arxiv.org/pdf/...",
    "doi": "10.1234/journal.2024.001",
    "source": "semantic-scholar",
    "methodology": "experiment",
    "openAccess": true
  }
]
```

**Python Response Example**:
```python
from flask import Flask, request, jsonify

@app.route('/api/search', methods=['POST'])
def search_papers():
    data = request.json
    query = data.get('query')
    filters = data.get('filters', {})
    
    # Your search logic across OpenAlex, Semantic Scholar, arXiv
    results = aggregate_search(query, filters)
    
    return jsonify(results)
```

---

### 2. Get Paper Details

**Endpoint**: `GET /api/papers/:id`

**Example**: `GET /api/papers/123abc`

**Response** (Single Paper object):
```json
{
  "id": "123abc",
  "title": "Deep Learning for Customer Experience",
  "authors": [...],
  "abstract": "...",
  "publicationDate": "2024-03-15",
  "venue": "Journal of Marketing",
  "citationCount": 47,
  "referenceCount": 82,
  "fieldsOfStudy": ["Marketing", "AI"],
  "pdfUrl": "https://...",
  "doi": "10.1234/...",
  "source": "semantic-scholar",
  "methodology": "experiment",
  "openAccess": true
}
```

**Python Example**:
```python
@app.route('/api/papers/<paper_id>', methods=['GET'])
def get_paper(paper_id):
    paper = fetch_paper_details(paper_id)
    return jsonify(paper)
```

---

### 3. Get Citation Network

**Endpoint**: `GET /api/citations/:paperId`

**Example**: `GET /api/citations/123abc`

**Response**:
```json
{
  "citations": [
    {
      "id": "paper-that-cites-this",
      "title": "...",
      "authors": [...],
      "citationCount": 20
    }
  ],
  "references": [
    {
      "id": "paper-this-cites",
      "title": "...",
      "authors": [...],
      "citationCount": 150
    }
  ]
}
```

**Python Example**:
```python
@app.route('/api/citations/<paper_id>', methods=['GET'])
def get_citations(paper_id):
    citations = get_papers_citing(paper_id)
    references = get_papers_referenced_by(paper_id)
    
    return jsonify({
        'citations': citations,
        'references': references
    })
```

---

### 4. Generate Topic Clusters

**Endpoint**: `POST /api/clusters`

**Request Body**:
```json
{
  "paperIds": ["id1", "id2", "id3", "id4"]
}
```

**Response**:
```json
[
  {
    "id": "cluster-1",
    "name": "AI in Customer Experience",
    "papers": [
      {
        "id": "id1",
        "title": "...",
        "authors": [...]
      }
    ],
    "keywords": ["AI", "Customer Experience", "Personalization"],
    "centralPaperId": "id1"
  },
  {
    "id": "cluster-2",
    "name": "Predictive Analytics",
    "papers": [...],
    "keywords": ["Machine Learning", "Prediction"],
    "centralPaperId": "id3"
  }
]
```

**Python Example**:
```python
@app.route('/api/clusters', methods=['POST'])
def generate_clusters():
    data = request.json
    paper_ids = data.get('paperIds', [])
    
    # Your clustering algorithm
    clusters = analyze_topic_clusters(paper_ids)
    
    return jsonify(clusters)
```

---

### 5. Generate Literature Review

**Endpoint**: `POST /api/review/generate`

**Request Body**:
```json
{
  "researchQuestion": "What is the impact of AI on customer experience?",
  "paperIds": ["id1", "id2", "id3"]
}
```

**Response**:
```json
{
  "id": "review-123",
  "title": "Literature Review: AI in Customer Experience",
  "researchQuestion": "What is the impact of AI on customer experience?",
  "sections": [
    {
      "title": "Introduction",
      "content": "This review synthesizes recent research on...",
      "citations": ["id1", "id2"],
      "type": "introduction"
    },
    {
      "title": "Key Themes",
      "content": "Three major themes emerge...",
      "citations": ["id1", "id2", "id3"],
      "type": "theme"
    },
    {
      "title": "Methodological Approaches",
      "content": "...",
      "citations": ["id2"],
      "type": "methodology"
    },
    {
      "title": "Key Findings",
      "content": "...",
      "citations": ["id1", "id3"],
      "type": "findings"
    },
    {
      "title": "Research Gaps",
      "content": "...",
      "citations": ["id2"],
      "type": "gaps"
    }
  ],
  "papers": [
    {
      "id": "id1",
      "title": "...",
      "authors": [...]
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "status": "complete"
}
```

**Python Example**:
```python
@app.route('/api/review/generate', methods=['POST'])
def generate_review():
    data = request.json
    question = data.get('researchQuestion')
    paper_ids = data.get('paperIds', [])
    
    # Your AI-powered review generation
    review = synthesize_literature_review(question, paper_ids)
    
    return jsonify(review)
```

---

## TypeScript Type Definitions

All types are defined in `lib/types.ts`. Here are the key ones:

### Paper Type
```typescript
interface Paper {
  id: string
  title: string
  authors: Author[]
  abstract: string
  publicationDate: string  // ISO date format
  venue: string
  citationCount: number
  referenceCount: number
  fieldsOfStudy: string[]
  pdfUrl?: string
  doi?: string
  source: "openalex" | "semantic-scholar" | "arxiv"
  methodology?: MethodologyType
  openAccess: boolean
}
```

### Author Type
```typescript
interface Author {
  id: string
  name: string
  affiliations?: string[]
  hIndex?: number
}
```

### Methodology Types
```typescript
type MethodologyType =
  | "survey"
  | "experiment"
  | "case-study"
  | "systematic-review"
  | "meta-analysis"
  | "qualitative"
  | "mixed-methods"
```

---

## Error Handling

Your backend should return appropriate HTTP status codes:

- **200**: Success
- **400**: Bad request (invalid parameters)
- **404**: Resource not found
- **500**: Server error

**Error Response Format**:
```json
{
  "error": "Error message here",
  "details": "Optional detailed error description"
}
```

The frontend will handle errors gracefully and fall back to mock data in development mode.

---

## CORS Configuration

Your Python backend must enable CORS to allow requests from the Next.js frontend:

```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=[
    'http://localhost:3000',  # Development
    'https://your-app.vercel.app'  # Production
])
```

---

## Testing Your Backend

1. Start your Python backend: `python app.py`
2. Test endpoints with curl:

```bash
# Test search
curl -X POST http://localhost:5000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "machine learning", "filters": {}}'

# Test paper details
curl http://localhost:5000/api/papers/123abc

# Test citations
curl http://localhost:5000/api/citations/123abc
```

3. Update frontend `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

4. Run frontend: `npm run dev`

5. Try searching - you should see real data from your backend!

---

## Deployment Checklist

### Frontend (Vercel)
- [ ] Push code to GitHub
- [ ] Import repository to Vercel
- [ ] Add `NEXT_PUBLIC_API_URL` environment variable
- [ ] Deploy

### Backend (Railway/Render)
- [ ] Push Python code to GitHub
- [ ] Import to Railway/Render
- [ ] Configure environment variables (API keys, etc.)
- [ ] Deploy
- [ ] Copy production URL
- [ ] Update `NEXT_PUBLIC_API_URL` in Vercel to production backend URL

---

## Need Help?

Check these files:
- `lib/api-client.ts` - All API calls with comments
- `lib/types.ts` - Complete type definitions
- `lib/mock-api.ts` - Example mock data structure

The mock data shows exactly what format your backend should return!
