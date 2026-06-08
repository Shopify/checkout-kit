package com.shopify.checkout_kit_android_demo.common.logs

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
     entities = [LogLine::class],
     version = 3,
     exportSchema = false,
)
abstract class LogDatabase : RoomDatabase() {
     abstract fun logDao(): LogDao
}

val MIGRATION_1_2 = object : Migration(1, 2) {
     override fun migrate(db: SupportSQLiteDatabase) {
          db.execSQL("ALTER TABLE LogLine ADD COLUMN checkout_completedorderDetails TEXT")
     }
}

val MIGRATION_2_3 = object : Migration(2, 3) {
     override fun migrate(db: SupportSQLiteDatabase) {
          db.execSQL(
               """
               CREATE TABLE LogLine_new (
                    id BLOB NOT NULL PRIMARY KEY,
                    createdAt INTEGER NOT NULL,
                    message TEXT NOT NULL,
                    type TEXT NOT NULL,
                    error_detailstype TEXT,
                    error_detailsmessage TEXT,
                    checkout_completedorderDetails TEXT
               )
               """.trimIndent()
          )
          db.execSQL(
               """
               INSERT INTO LogLine_new (id, createdAt, message, type, error_detailstype, error_detailsmessage, checkout_completedorderDetails)
               SELECT id, createdAt, message, type, error_detailstype, error_detailsmessage, checkout_completedorderDetails
               FROM LogLine
               WHERE type IN ('STANDARD', 'ERROR', 'CHECKOUT_COMPLETED')
               """.trimIndent()
          )
          db.execSQL("DROP TABLE LogLine")
          db.execSQL("ALTER TABLE LogLine_new RENAME TO LogLine")
     }
}
