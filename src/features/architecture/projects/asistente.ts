import type { Project } from '../types'

export const asistente = {
  id: 'asistente',
  name: 'Asistente',
  tagline: 'Chatbot de ayuda dentro de Sygna. Responde dudas de uso con el contenido de ayuda del propio ERP y, cuando no basta, pasa la conversación a una persona.',
  what: 'RAG sobre la documentación de ayuda de Sygna, desplegado en una sola máquina sin GPU. Cada cambio en la ayuda se reindexa solo.',
  summary: [
    ['Fragmentos', '400 tokens · solape 80'],
    ['Recuperación', 'top-k + reranking'],
    ['Modelo', 'DeepSeek API u Ollama'],
    ['Infra', '1 droplet · solo CPU'],
    ['Despliegue', 'git push → hook'],
  ],
  slab: {
    x: 2.4, y: -0.6, w: 12.2, d: 9.2, h: 0.5,
    label: 'DIGITALOCEAN DROPLET · DOCKER COMPOSE', tech: ['DigitalOcean', 'Docker Compose'],
  },
  nodes: [
    {
      id: 'repo', x: 0, y: 0, h: 1.0, role: 'ext', name: 'Repositorio Sygna', sub: 'ayuda en JSON', tech: ['Git'],
      desc: 'Fuente de verdad: los artículos de ayuda viven versionados junto al código del ERP.',
    },
    {
      id: 'user', x: 0, y: 3, h: 1.0, role: 'ext', name: 'Usuario de Sygna', sub: 'pregunta en el chat', tech: [],
      desc: 'Persona que usa Sygna y pregunta cómo hacer algo.',
    },
    {
      id: 'git', x: 0, y: 6, h: 0.8, role: 'ops', name: 'git push', sub: 'despliegue', tech: ['Git'],
      desc: 'Desplegar es hacer push: no hay paso manual.',
    },
    {
      id: 'sync', x: 3, y: 0, h: 0.8, role: 'ingest', name: 'Sync', sub: 'cron diario + post-receive', tech: ['Python', 'cron'],
      desc: 'Detecta cambios en la ayuda y lanza la reindexación.',
      decision: { chose: 'cron + hook post-receive', over: 'reindexar a mano', why: 'El hook cubre cada despliegue y el cron recoge lo que cambie por fuera. El índice nunca se queda viejo sin que nadie lo note.', draft: true },
    },
    {
      id: 'chunk', x: 6, y: 0, h: 0.8, role: 'ingest', name: 'Chunking', sub: '400 tokens · overlap 80', tech: ['Python'],
      desc: 'Trocea cada artículo en fragmentos solapados para no cortar una instrucción a medias.',
      decision: { chose: '400 tokens con 80 de solape', over: 'un vector por artículo', why: 'Un artículo de ayuda mezcla varios procedimientos. Trozos pequeños recuperan el paso concreto y el solape evita partir una instrucción.', draft: true },
    },
    {
      id: 'emb', x: 9, y: 0, h: 0.8, role: 'ingest', name: 'Embeddings', sub: 'nomic-embed-text', tech: ['nomic-embed-text'],
      desc: 'Convierte cada fragmento en un vector, en la propia máquina y sin GPU.',
      decision: { chose: 'nomic-embed-text en local', over: 'embeddings por API', why: 'Cabe en CPU dentro del droplet: reindexar no cuesta por token ni depende de un tercero.', draft: true },
    },
    {
      id: 'qd', x: 12, y: 0, h: 1.6, role: 'data', shape: 'cyl', name: 'Qdrant', sub: 'vector store', tech: ['Qdrant'],
      desc: 'Guarda los vectores y responde búsquedas por similitud.',
      decision: { chose: 'Qdrant', over: 'pgvector en la base de Sygna', why: 'Servicio aislado del ERP: reindexar la ayuda no toca la base de datos de producción y se puede tirar y reconstruir sin miedo.', draft: true },
    },
    {
      id: 'nginx', x: 3, y: 3, h: 1.0, role: 'app', name: 'Nginx', sub: 'HTTPS', tech: ['Nginx'],
      desc: 'Termina TLS y hace de proxy inverso hacia la API.',
    },
    {
      id: 'api', x: 6, y: 3, h: 1.4, role: 'app', name: 'API /v1/chat', sub: 'FastAPI · API key', tech: ['Python', 'FastAPI'],
      desc: 'Punto de entrada del chat. Autentica cada petición con API key.',
    },
    {
      id: 'ret', x: 12, y: 3, h: 1.0, role: 'app', name: 'Recuperación', sub: 'top-k', tech: ['Qdrant'],
      desc: 'Busca en Qdrant los k fragmentos más parecidos a la pregunta.',
    },
    {
      id: 'rr', x: 12, y: 6, h: 1.0, role: 'app', name: 'Reranking', sub: 'BAAI bge-reranker', tech: ['bge-reranker'],
      desc: 'Reordena los candidatos con un cross-encoder y se queda con los relevantes.',
      decision: { chose: 'Reranker cross-encoder', over: 'solo similitud vectorial', why: 'El top-k vectorial trae fragmentos parecidos pero no siempre útiles. Reordenar antes de llamar al LLM mejora la respuesta y gasta menos contexto.', draft: true },
    },
    {
      id: 'gen', x: 9, y: 6, h: 1.2, role: 'app', name: 'Generación', sub: 'prompt en español', tech: ['Python'],
      desc: 'Redacta la respuesta en español a partir del contexto recuperado.',
    },
    {
      id: 'ho', x: 6, y: 6, h: 0.8, role: 'app', name: 'Handoff', sub: 'a agente humano', tech: ['Python'],
      desc: 'Detecta cuándo el bot no basta y deriva la conversación a una persona.',
      decision: { chose: 'Derivar a una persona', over: 'contestar siempre', why: 'En soporte, una respuesta inventada cuesta más que una espera.', draft: true },
    },
    {
      id: 'hook', x: 3, y: 6, h: 0.8, role: 'ops', name: 'Hook post-receive', sub: 'build · health · reingesta', tech: ['Git', 'Docker Compose'],
      desc: 'Construye las imágenes, comprueba que la API responde y reindexa la ayuda.',
      decision: { chose: 'Hook post-receive', over: 'pipeline de CI/CD', why: 'Con un solo droplet, push → build → health check → reingesta es todo el despliegue, sin infraestructura extra.', draft: true },
    },
    {
      id: 'llm', x: 9, y: 10, h: 1.2, role: 'ext', name: 'LLM', sub: 'DeepSeek API · Ollama gpt-oss:20b', tech: ['DeepSeek', 'Ollama'],
      desc: 'Modelo intercambiable: la API de DeepSeek u Ollama en local con gpt-oss:20b.',
      decision: { chose: 'Proveedor intercambiable', over: 'un único proveedor', why: 'DeepSeek por coste u Ollama en local si los datos no deben salir, con la misma interfaz.', draft: true },
    },
  ],
  edges: [
    ['repo', 'sync', 'ingest'], ['sync', 'chunk', 'ingest'], ['chunk', 'emb', 'ingest'], ['emb', 'qd', 'ingest'],
    ['user', 'nginx', 'query'], ['nginx', 'api', 'query'], ['api', 'ret', 'query'], ['ret', 'qd', 'query'],
    ['ret', 'rr', 'query'], ['rr', 'gen', 'query'], ['gen', 'llm', 'query'], ['gen', 'ho', 'query'],
    ['git', 'hook', 'deploy'], ['hook', 'api', 'deploy', 'arc'], ['hook', 'sync', 'deploy', 'arc'],
  ],
} satisfies Project
