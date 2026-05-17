import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MilvusClient, DataType } from '@zilliz/milvus2-sdk-node'

@Injectable()
export class MilvusService implements OnModuleInit, OnModuleDestroy {
  private client: MilvusClient
  private readonly collectionName = 'knowledge_chunks'
  private readonly dim = 1024

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get('MILVUS_HOST', 'localhost')
    const port = this.configService.get<number>('MILVUS_PORT', 19530)

    this.client = new MilvusClient({
      address: `${host}:${port}`,
      timeout: 30000,
    })

    await this.ensureCollection()
  }

  private async ensureCollection() {
    const hasCollection = await this.client.hasCollection({
      collection_name: this.collectionName,
    })

    if (!hasCollection.value) {
      await this.client.createCollection({
        collection_name: this.collectionName,
        fields: [
          { name: 'id', data_type: DataType.Int64, is_primary_key: true, autoID: true },
          { name: 'chunk_id', data_type: DataType.VarChar, max_length: 100 },
          { name: 'doc_id', data_type: DataType.VarChar, max_length: 100 },
          { name: 'embedding', data_type: DataType.FloatVector, dim: this.dim },
        ],
      })
      // New empty collection - index will be created when data is inserted
      return
    }

    // Collection exists - ensure index and load
    try {
      await this.client.createIndex({
        collection_name: this.collectionName,
        field_name: 'embedding',
        index_type: 'IVF_FLAT',
        metric_type: 'IP',
        params: { nlist: 1024 } as any,
      })
    } catch { /* already exists */ }

    await this.client.loadCollection({ collection_name: this.collectionName })
  }

  async insert(chunkId: string, docId: string, embedding: number[]): Promise<string> {
    const result = await this.client.insert({
      collection_name: this.collectionName,
      data: [{ chunk_id: chunkId, doc_id: docId, embedding }],
    })
    const ids = (result.IDs as any)?.IntId?.data?.[0]
    return ids ? String(ids) : ''
  }

  async insertBatch(
    records: Array<{ chunkId: string; docId: string; embedding: number[] }>,
  ): Promise<string[]> {
    const data = records.map((r) => ({
      chunk_id: r.chunkId,
      doc_id: r.docId,
      embedding: r.embedding,
    }))
    const result = await this.client.insert({
      collection_name: this.collectionName,
      data,
    })
    const ids = ((result.IDs as any)?.IntId?.data || []) as Array<string | number>
    return ids.map((id) => String(id))
  }

  async search(queryVector: number[], topK = 5, filter?: string): Promise<any> {
    return this.client.search({
      collection_name: this.collectionName,
      vector: queryVector,
      limit: topK,
      output_fields: ['chunk_id', 'doc_id'],
      filter,
    })
  }

  async deleteByChunkId(chunkId: string): Promise<void> {
    await this.client.delete({
      collection_name: this.collectionName,
      filter: `chunk_id == "${chunkId}"`,
    })
  }

  async deleteByDocId(docId: string): Promise<void> {
    await this.client.delete({
      collection_name: this.collectionName,
      filter: `doc_id == "${docId}"`,
    })
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.client.checkHealth()
      return result.isHealthy
    } catch {
      return false
    }
  }

  async onModuleDestroy() {
    await this.client.closeConnection()
  }
}
