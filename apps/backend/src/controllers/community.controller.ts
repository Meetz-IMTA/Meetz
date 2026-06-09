import type { Request, Response } from "express";
import {
  getCategories,
  getCategoryById,
  createCategory,
  getThreads,
  getThreadById,
  createThread,
  updateThread,
  deleteThread,
  toggleLike,
  type ThreadFilters,
} from "../services/community.service.js";
import {
  createComment,
  deleteComment,
  toggleCommentLike,
  reportThread,
  reportComment,
} from "../services/comment.service.js";
import { uploadImage } from "../lib/cloudinary.js";

const resolveImageUrls = async (req: Request): Promise<string[]> => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  return Promise.all(
    files.map((f) => uploadImage(f.buffer, "meetz/community")),
  );
};

const resolveSingleImageUrl = async (
  req: Request,
): Promise<string | undefined> => {
  if (req.file?.buffer) return uploadImage(req.file.buffer, "meetz/community");
  if (typeof req.body.gifUrl === "string" && req.body.gifUrl)
    return req.body.gifUrl;
  return undefined;
};

// ── Categories ────────────────────────────────────────────────────────────

export const listCategories = async (_req: Request, res: Response) => {
  try {
    res.json(await getCategories());
  } catch {
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des catégories." });
  }
};

export const getCategory = async (req: Request, res: Response) => {
  try {
    res.json(await getCategoryById(Number(req.params["id"])));
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const createCategoryHandler = async (req: Request, res: Response) => {
  try {
    res.status(201).json(await createCategory(req.body));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// ── Threads ───────────────────────────────────────────────────────────────

export const listThreads = async (req: Request, res: Response) => {
  try {
    const { categoryId, search, authorId, sort, page, limit } = req.query;
    const filters: ThreadFilters = {};
    if (typeof categoryId === "string") filters.categoryId = Number(categoryId);
    if (typeof authorId === "string") filters.authorId = Number(authorId);
    if (typeof search === "string") filters.search = search;
    if (sort === "recent" || sort === "popular") filters.sort = sort;
    if (typeof page === "string") filters.page = Number(page);
    if (typeof limit === "string") filters.limit = Number(limit);
    res.json(await getThreads(filters));
  } catch {
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des threads." });
  }
};

export const getThread = async (req: Request, res: Response) => {
  try {
    res.json(await getThreadById(Number(req.params["id"]), req.userId));
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

const parseThreadBody = (req: Request) => {
  const body: any = { ...req.body };
  if (body.categoryId !== undefined) body.categoryId = Number(body.categoryId);
  return body;
};

const parseRemovedImageIds = (raw: unknown): number[] => {
  if (raw == null) return [];
  const parts = Array.isArray(raw) ? raw : String(raw).split(",");
  return parts.map((x) => Number(x)).filter((n) => Number.isFinite(n));
};

export const createThreadHandler = async (req: Request, res: Response) => {
  try {
    const body = parseThreadBody(req);
    if (!body.title?.trim()) throw new Error("Le titre est obligatoire.");
    if (!body.content?.trim()) throw new Error("Le contenu est obligatoire.");
    if (!body.categoryId) throw new Error("La catégorie est obligatoire.");

    const imageUrls = await resolveImageUrls(req);
    res
      .status(201)
      .json(await createThread({ ...body, imageUrls }, req.userId!));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateThreadHandler = async (req: Request, res: Response) => {
  try {
    const body = parseThreadBody(req);
    const imageUrls = await resolveImageUrls(req);
    const removedImageIds = parseRemovedImageIds(req.body.removedImageIds);
    res.json(
      await updateThread(
        Number(req.params["id"]),
        { ...body, imageUrls, removedImageIds },
        req.userId!,
      ),
    );
  } catch (error: any) {
    const status = error.message.includes("Non autorisé") ? 403 : 404;
    res.status(status).json({ error: error.message });
  }
};

export const deleteThreadHandler = async (req: Request, res: Response) => {
  try {
    await deleteThread(Number(req.params["id"]), req.userId!);
    res.status(204).send();
  } catch (error: any) {
    const status = error.message.includes("Non autorisé") ? 403 : 404;
    res.status(status).json({ error: error.message });
  }
};

export const toggleLikeHandler = async (req: Request, res: Response) => {
  try {
    res.json(await toggleLike(Number(req.params["id"]), req.userId!));
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

// ── Comments ──────────────────────────────────────────────────────────────

export const createCommentHandler = async (req: Request, res: Response) => {
  try {
    const { content, parentCommentId } = req.body;
    const imageUrl = await resolveSingleImageUrl(req);
    res.status(201).json(
      await createComment(
        Number(req.params["id"]),
        {
          content,
          ...(imageUrl && { imageUrl }),
          ...(parentCommentId != null && {
            parentCommentId: Number(parentCommentId),
          }),
        },
        req.userId!,
      ),
    );
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteCommentHandler = async (req: Request, res: Response) => {
  try {
    await deleteComment(Number(req.params["commentId"]), req.userId!);
    res.status(204).send();
  } catch (error: any) {
    const status = error.message.includes("Non autorisé") ? 403 : 404;
    res.status(status).json({ error: error.message });
  }
};

export const toggleCommentLikeHandler = async (req: Request, res: Response) => {
  try {
    res.json(
      await toggleCommentLike(Number(req.params["commentId"]), req.userId!),
    );
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const reportCommentHandler = async (req: Request, res: Response) => {
  try {
    await reportComment(
      Number(req.params["commentId"]),
      req.userId!,
      req.body?.reason,
    );
    res.status(201).json({ message: "Signalement enregistré." });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const reportThreadHandler = async (req: Request, res: Response) => {
  try {
    await reportThread(Number(req.params["id"]), req.userId!, req.body?.reason);
    res.status(201).json({ message: "Signalement enregistré." });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};
