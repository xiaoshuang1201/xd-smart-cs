import { Prisma } from '@prisma/client';

export function softDeleteExtension(): Prisma.Middleware {
  return async (params, next) => {
    if (params.model === 'KnowledgeDoc') {
      if (params.action === 'delete') {
        params.action = 'update';
        params.args = { ...params.args, data: { deletedAt: new Date() } };
      }
      if (params.action === 'deleteMany') {
        params.action = 'updateMany';
        params.args = { ...params.args, data: { deletedAt: new Date() } };
      }
      if (params.action === 'findUnique' || params.action === 'findFirst' || params.action === 'findUniqueOrThrow' || params.action === 'findFirstOrThrow') {
        params.args = { ...params.args, where: { ...(params.args?.where ?? {}), deletedAt: null } };
      }
      if (params.action === 'findMany') {
        params.args = { ...params.args, where: { ...(params.args?.where ?? {}), deletedAt: null } };
      }
      if (params.action === 'count' || params.action === 'aggregate') {
        params.args = { ...params.args, where: { ...(params.args?.where ?? {}), deletedAt: null } };
      }
    }
    return next(params);
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function paginate<T>(
  findManyFn: () => Promise<T[]>,
  countFn: () => Promise<number>,
  params: PaginationParams = {},
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));

  const [items, total] = await Promise.all([findManyFn(), countFn()]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
