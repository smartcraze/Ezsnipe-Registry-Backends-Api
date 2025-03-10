import { Router } from "express";
import { prisma } from "./db";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { authenticateUser } from "./middleware";
export const componentsRouter = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// R2 Config
const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
});
const BUCKET_NAME = process.env.R2_BUCKET_NAME!;

componentsRouter.post(
  "/upload",
  authenticateUser,
  upload.single("file"),
  async (req, res) => {
    try {
      const { name, version, dependencies } = req.body;
      const file = req.file;

      if (!name || !version || !file) {
        res.status(400).json({ message: "Missing required fields or file" });
        return;
      }

      let component = await prisma.component.findUnique({ where: { name } });

      const authorId = req.userId;

      if (!authorId) {
        throw new Error("User ID is missing");
      }

      if (!component) {
        component = await prisma.component.create({
          data: { name, authorId, type: "registry:ui" },
        });
      }

      // Upload file to R2
      const fileKey = `${name}/${version}/${file.originalname}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      const fileUrl = `${process.env.R2_DEV}/${fileKey}`;

      // Store version data in DB
      const newVersion = await prisma.componentVersion.create({
        data: {
          componentId: component.id,
          version,
          dependencies: dependencies ? JSON.parse(dependencies) : [],
          files: {
            create: {
              path: file.originalname,
              url: fileUrl,
            },
          },
        },
        include: {
          files: true,
        },
      });

      res
        .status(201)
        .json({ message: "Component uploaded", version: newVersion });
    } catch (error: any) {
      console.error("Upload error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }
);

componentsRouter.get("/list", authenticateUser, async (req, res) => {
  try {
    const userId = req.userId;

    const components = await prisma.component.findMany({
      where: { authorId: userId },
      include: {
        versions: {
          include: {
            files: true,
          },
        },
      },
    });

    const formattedResponse = {
      components: components.map((component) => ({
        name: component.name,
        versions: Object.fromEntries(
          component.versions.map((v) => [v.version, v.files.map((f) => f.url)])
        ),
      })),
    };

    res.status(200).json(formattedResponse);
  } catch (error) {
    console.error("Error fetching components:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

componentsRouter.get("/:name", async (req, res) => {
  try {
    const { name } = req.params;

    const component = await prisma.component.findUnique({
      where: { name },
      include: {
        versions: {
          include: {
            files: true,
          },
        },
      },
    });

    if (!component) {
      res.status(404).json({ message: "Component not found" });
      return;
    }

    res.status(200).json({ component });
  } catch (error) {
    console.error("Error fetching component:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

componentsRouter.get("/:name/:version", async (req, res) => {
  try {
    const { name, version } = req.params;

    const component = await prisma.component.findUnique({
      where: { name },
      include: {
        versions: {
          where: { version },
          include: {
            files: true,
          },
        },
      },
    });

    if (!component) {
      res.status(404).json({ message: "Component not found" });
      return;
    }

    res.status(200).json({ component });
  } catch (error) {
    console.error("Error fetching component:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
