import { relations } from "drizzle-orm/relations";
import { users, watchlist } from "./schema";

export const watchlistRelations = relations(watchlist, ({one}) => ({
	user: one(users, {
		fields: [watchlist.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	watchlists: many(watchlist),
}));