import os
import math
import re
from collections import Counter
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="Vidya AI RAG Service", description="NCERT Multi-lingual Retrieval Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
)

# ----------------------------------------------------
# 📚 NCERT SEED DATABASE (SCIENCE, SOCIAL STUDIES, EVS)
# ----------------------------------------------------
NCERT_DOCUMENTS = [
    # Class 3 EVS
    {
        "id": "c3_evs_ch2",
        "chapter": "NCERT Class 3 Environmental Studies - Chapter 2: The Plant Fairy",
        "content": "Leaves of different plants have different margins and shapes. Some are green, some are yellow or red. Chlorophyll makes leaves green, and they use sunshine to build energy. Under the sun, they breathe and create sweet materials.",
        "class_level": 3,
        "subject": "EVS",
        "citation": "NCERT EVS Class 3, Chapter 2, Page 11"
    },
    {
        "id": "c3_evs_ch5",
        "chapter": "NCERT Class 3 Environmental Studies - Chapter 5: Chhotu's House",
        "content": "A house protects us from cold wind, heavy monsoon rains, and strong summer heat. In villages, houses are made of mud, bamboo, and dry palm leaves. Sharing our home with family and domestic animals brings joy.",
        "class_level": 3,
        "subject": "EVS",
        "citation": "NCERT EVS Class 3, Chapter 5, Page 32"
    },
    # Class 8 Science
    {
        "id": "c8_sci_ch1",
        "chapter": "NCERT Class 8 Science - Chapter 1: Crop Production & Management",
        "content": "India has diverse climatic conditions. Crop categorization includes: Kharif crops which are sown during monsoon rains (Paddy, Maize, Soyabean, Cotton) from June to September; Rabi crops sown in winter season (Wheat, Gram, Mustard) from October to March. Basic agricultural steps include preparation of soil, sowing, adding manure, and harvesting.",
        "class_level": 8,
        "subject": "Science",
        "citation": "NCERT Science Class 8, Chapter 1, Page 3"
    },
    {
        "id": "c8_sci_ch2",
        "chapter": "NCERT Class 8 Science - Chapter 2: Microorganisms Friends & Foe",
        "content": "Microorganisms like bacteria, fungi, protozoa, and algae exist everywhere. Some are useful in curd preparation (Lactobacillus), bread backing (yeast), or vaccine development. Others are pathogens causing cholera, malaria (Plasmodium carried by Anopheles mosquito), and crown gall in plants.",
        "class_level": 8,
        "subject": "Science",
        "citation": "NCERT Science Class 8, Chapter 2, Page 18"
    },
    {
        "id": "c8_sci_ch11",
        "chapter": "NCERT Class 8 Science - Chapter 11: Force and Pressure",
        "content": "A push or pull on an object is called a force. Force arises due to interaction. Types of forces are: contact forces (muscular force, friction) and non-contact forces (magnetic force, electrostatic force, gravitational force). Pressure is force acting per unit area: P = Force / Area.",
        "class_level": 8,
        "subject": "Science",
        "citation": "NCERT Science Class 8, Chapter 11, Page 128"
    },
    # Class 12 Science/Biology/Physics
    {
        "id": "c12_bio_ch13",
        "chapter": "NCERT Class 12 Biology - Chapter 13: Photosynthesis in Higher Plants",
        "content": "Photosynthesis is a physico-chemical process utilizing solar energy to drive organic compound synthesis. Inside the thylakoid membranes, Light Reactions involve photophosphorylation: water oxidation (oxygen evolving complex) drives electron transport through PS-II and PS-I to synthesize ATP and NADPH. Dark Reactions (Calvin Cycle / C3 pathway) in the stroma utilize RuBisCO to fix CO₂ into 3-phosphoglyceric acid (PGA).",
        "class_level": 12,
        "subject": "Biology",
        "citation": "NCERT Biology Class 12, Chapter 13, Page 210"
    },
    {
        "id": "c12_bio_ch15",
        "chapter": "NCERT Class 12 Biology - Chapter 15: Biodiversity and Conservation",
        "content": "Biodiversity is the vast variability of life on Earth. India represents one of the 12 mega-biodiversity countries, boasting rich endemic species in the Western Ghats and Indo-Burma hotspots. Threats include habitat fragmentation, over-exploitation, and co-extinctions. Conservation utilizes in-situ methods (Biosphere Reserves, National Parks) and ex-situ methods (Gene banks, Botanical gardens).",
        "class_level": 12,
        "subject": "Biology",
        "citation": "NCERT Biology Class 12, Chapter 15, Page 256"
    },
    {
        "id": "c12_phy_ch12",
        "chapter": "NCERT Class 12 Physics - Chapter 12: Atoms",
        "content": "Ernest Rutherford's alpha particle scattering experiment established the dense positive nucleus. Niels Bohr formulated atomic models with orbiting electrons in non-radiating discrete energy shells, satisfying angular momentum quantization L = n*h/(2*pi). Wave-particle duality later refined this via Schrödinger's orbital probability wavefields.",
        "class_level": 12,
        "subject": "Physics",
        "citation": "NCERT Physics Class 12, Chapter 12, Page 415"
    }
]

# ----------------------------------------------------
# 🔍 NEURAL ML SETUP (CHROMADB + SENTENCE TRANSFORMERS)
# ----------------------------------------------------
HAS_NEURAL = False
db_client = None
collection = None
model = None

try:
    import chromadb
    from sentence_transformers import SentenceTransformer
    
    # Initialize chroma DB client (in-memory)
    db_client = chromadb.Client()
    collection = db_client.get_or_create_collection(name="ncert_curriculum")
    model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
    
    # Seed neural database
    ids = [doc["id"] for doc in NCERT_DOCUMENTS]
    documents = [doc["content"] for doc in NCERT_DOCUMENTS]
    metadatas = [{"chapter": doc["chapter"], "class_level": doc["class_level"], "subject": doc["subject"], "citation": doc["citation"]} for doc in NCERT_DOCUMENTS]
    
    embeddings = model.encode(documents).tolist()
    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas
    )
    HAS_NEURAL = True
    print("Successfully initialized neural ChromaDB and SentenceTransformer!")
except Exception as e:
    print(f"Neural packages not initialized: {e}. Falling back to high-speed mathematical TF-IDF vector matcher.")

# ----------------------------------------------------
# 🧮 TF-IDF PURE-PYTHON SEARCH BACK-UP
# ----------------------------------------------------
def tokenize(text):
    return re.findall(r'\w+', text.lower())

def compute_tf(tokens):
    tf = Counter(tokens)
    total = len(tokens) or 1
    return {k: v / total for k, v in tf.items()}

def compute_idf(docs):
    N = len(docs)
    idf = {}
    all_words = set(w for doc in docs for w in tokenize(doc))
    for w in all_words:
        count = sum(1 for doc in docs if w in tokenize(doc))
        idf[w] = math.log((1 + N) / (1 + count)) + 1
    return idf

def get_tfidf_vector(tf, idf):
    vec = {}
    for w, val in tf.items():
        vec[w] = val * idf.get(w, 0.0)
    return vec

def cosine_similarity(v1, v2):
    intersect = set(v1.keys()).intersection(v2.keys())
    dot_product = sum(v1[k] * v2[k] for k in intersect)
    mag1 = math.sqrt(sum(val * val for val in v1.values()))
    mag2 = math.sqrt(sum(val * val for val in v2.values()))
    if not mag1 or not mag2:
        return 0.0
    return dot_product / (mag1 * mag2)

# Precalculate documents TF-IDF representations
ALL_CONTENTS = [doc["content"] for doc in NCERT_DOCUMENTS]
DOC_TOKENS = [tokenize(content) for content in ALL_CONTENTS]
DOC_TFS = [compute_tf(tokens) for tokens in DOC_TOKENS]
IDF_DICT = compute_idf(ALL_CONTENTS)
DOC_VECTORS = [get_tfidf_vector(tf, IDF_DICT) for tf in DOC_TFS]

def search_tfidf(query_text: str, class_level: int) -> List[dict]:
    query_tokens = tokenize(query_text)
    query_tf = compute_tf(query_tokens)
    query_vec = get_tfidf_vector(query_tf, IDF_DICT)
    
    results = []
    for idx, doc in enumerate(NCERT_DOCUMENTS):
        # Filtering by class level if requested
        score = cosine_similarity(query_vec, DOC_VECTORS[idx])
        
        # Boost score slightly if class levels match exactly
        if doc["class_level"] == class_level:
            score += 0.15
            
        results.append({
            "score": min(score, 1.0),
            "chapter": doc["chapter"],
            "content": doc["content"],
            "citation": doc["citation"],
            "class_level": doc["class_level"],
            "subject": doc["subject"]
        })
        
    # Sort results by score descending
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:3]

# ----------------------------------------------------
# 🔌 FASTAPI ROUTING ENDPOINTS
# ----------------------------------------------------
class SearchResult(BaseModel):
    chapter: str
    content: str
    citation: str
    class_level: int
    subject: str
    score: float

class QueryResponse(BaseModel):
    engine: str
    results: List[SearchResult]

@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "online",
        "engine": "ChromaDB + SentenceTransformers" if HAS_NEURAL else "Local TF-IDF Vector System",
        "documents_indexed": len(NCERT_DOCUMENTS)
    }

@app.get("/search", response_model=QueryResponse, tags=["Search"])
def search(query: str, class_level: Optional[int] = 8):
    if HAS_NEURAL:
        try:
            query_emb = model.encode([query]).tolist()
            res = collection.query(
                query_embeddings=query_emb,
                n_results=3,
                where={"class_level": class_level} if class_level else None
            )
            
            results = []
            if res and res["documents"] and len(res["documents"][0]) > 0:
                for i in range(len(res["documents"][0])):
                    results.append(SearchResult(
                        chapter=res["metadatas"][0][i]["chapter"],
                        content=res["documents"][0][i],
                        citation=res["metadatas"][0][i]["citation"],
                        class_level=res["metadatas"][0][i]["class_level"],
                        subject=res["metadatas"][0][i]["subject"],
                        score=1.0 - (res["distances"][0][i] if "distances" in res else 0.5)
                    ))
                return QueryResponse(engine="ChromaDB + SentenceTransformers", results=results)
        except Exception as e:
            print(f"Neural query failed, falling back to TF-IDF: {e}")
            
    # Fallback to pure TF-IDF
    tfidf_results = search_tfidf(query, class_level)
    formatted = [SearchResult(**res) for res in tfidf_results]
    return QueryResponse(engine="Local TF-IDF Vector System", results=formatted)
