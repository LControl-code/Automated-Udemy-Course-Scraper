import { captureException, addBreadcrumb } from '@sentry/node';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Connects to the database using the MONGODB_URI from the environment variables.
 * Adds a breadcrumb for tracking the connection status.
 * @throws {Error} If there is an error connecting to the database.
 */
async function connectToDatabase() {
  try {
    addBreadcrumb({
      category: 'database',
      message: 'Connecting to database',
      level: 'info',
    });

    // Database connection logic
    await mongoose.connect(process.env.MONGODB_URI);

    addBreadcrumb({
      category: 'database',
      message: 'Connected to database',
      level: 'info',
    });
  } catch (error) {
    captureException(error);
    throw error;
  }
}

// Define the schema for the courses collection
const coursesSchema = new mongoose.Schema({
  udemyCourseId: {
    type: Number,
    required: [true, "Udemy Course ID is required."],
  },

  couponCode: {
    type: String,
    required: [true, "Coupon Code is required."],
  },

  udemyUrls: {
    courseLink: {
      type: String,
      required: [true, "Course Link is required."],
    },
    checkoutLink: {
      type: String,
      required: [true, "Checkout Link is required."],
    }
  },

  courseInfo: {
    title: {
      type: String,
      required: [true, "Title is required."],
    },
    description: {
      type: String,
    },
    originalPrice: {
      type: Number,
      required: [true, "Original Price is required."],
    },
    category: {
      type: String,
      required: [true, "Category is required."],
    },
    language: {
      type: String,
      required: [true, "Language is required."],
    },
    imageLink: {
      type: String,
      required: [true, "Image Link is required."],
    },
  },

  instructor: {
    name: {
      type: String,
      required: [true, "Instructor Name is required."],
    },
    jobTitle: {
      type: String,
      required: [true, "Job Title is required."],
    },
    image: {
      type: String,
      required: [true, "Image is required."],
    },
    link: {
      type: String,
      required: [true, "Link is required."],
    }
  },

  webLink: {
    type: String,
  },
  courseSlug: {
    type: String,
    required: [true, "Course Slug is required."],
  },
}, {
  timestamps: true,
});

// Creating a model for the courses collection using the schema
const coursesModel = mongoose.model("courses", coursesSchema)

/**
 * Writes the provided courses to the database.
 * Connects to the database, creates course documents, and handles duplicate course errors.
 * @param {Array} courses - The courses to write to the database.
 * @throws {Error} If there is an error during the operation.
 */
export default async function databaseWrite(courses) {
  if (!courses || courses.length === 0) {
    return;
  }

  try {
    await connectToDatabase();

    const createPromises = courses.map(course =>
      coursesModel.create(course).catch(error => {
        captureException(error);
        console.error("Duplicate course was trying to be written", error);
      })
    );
    await Promise.all(createPromises);

  } catch (error) {
    captureException(error);
    console.error("An error occurred while writing to the database", error);
  }
}
