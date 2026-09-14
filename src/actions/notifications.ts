"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Notification } from "@/models";
import { requireUser } from "@/lib/auth/current-user";
import { objectId } from "@/lib/utils/sanitize-query";
import { okVoid, toActionError } from "@/lib/action-helpers";
import type { ActionResult } from "@/types";

export async function markNotificationRead(
  notificationId: string
): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    await connectToDatabase();

    // Scoping the update by userId means a crafted id cannot touch someone
    // else's notifications.
    await Notification.updateOne(
      { _id: objectId(notificationId), userId: objectId(user.id) },
      { $set: { read: true } }
    ).exec();

    revalidatePath("/notifications");
    return okVoid();
  } catch (error) {
    return toActionError(error);
  }
}

export async function markAllNotificationsRead(): Promise<
  ActionResult<undefined>
> {
  try {
    const user = await requireUser();
    await connectToDatabase();

    await Notification.updateMany(
      { userId: objectId(user.id), read: false },
      { $set: { read: true } }
    ).exec();

    revalidatePath("/notifications");
    return okVoid("All caught up.");
  } catch (error) {
    return toActionError(error);
  }
}
