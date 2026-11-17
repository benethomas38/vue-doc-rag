import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

/**
 * Modèle d'embeddings multilingue qui tourne en local (gratuit, sans clé API).
 * La doc Vue est en anglais mais les questions peuvent être en français :
 * un modèle multilingue rapproche les deux.
 * Les modèles E5 attendent un préfixe "query: " ou "passage: ".
 */
const MODEL = "Xenova/multilingual-e5-small";

let extractor: FeatureExtractionPipeline | null = null;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  // Le modèle (~120 Mo) est téléchargé au premier lancement, puis mis en cache.
  extractor ??= await pipeline("feature-extraction", MODEL, { dtype: "q8" });
  return extractor;
}

async function embed(texts: string[]): Promise<number[][]> {
  const ex = await getExtractor();
  const out = await ex(texts, { pooling: "mean", normalize: true });
  return out.tolist() as number[][];
}

export function embedPassages(texts: string[]): Promise<number[][]> {
  return embed(texts.map((t) => `passage: ${t}`));
}

export async function embedQuery(text: string): Promise<number[]> {
  const [v] = await embed([`query: ${text}`]);
  return v;
}
