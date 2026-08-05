package com.shopify.checkoutkit.androiddemo.common.logs

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

private const val SCHEMA_VERSION_1 = 1
private const val SCHEMA_VERSION_2 = 2
private const val SCHEMA_VERSION_3 = 3
private const val SCHEMA_VERSION_4 = 4

@Database(
    entities = [LogLine::class],
    version = SCHEMA_VERSION_4,
    exportSchema = false,
)
abstract class LogDatabase : RoomDatabase() {
    abstract fun logDao(): LogDao
}

val MIGRATION_1_2 = object : Migration(SCHEMA_VERSION_1, SCHEMA_VERSION_2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE LogLine ADD COLUMN checkout_completedorderDetails TEXT")
    }
}

val MIGRATION_2_3 = object : Migration(SCHEMA_VERSION_2, SCHEMA_VERSION_3) {
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

val MIGRATION_3_4 = object : Migration(SCHEMA_VERSION_3, SCHEMA_VERSION_4) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            """
               CREATE TABLE LogLine_new (
                    id BLOB NOT NULL PRIMARY KEY,
                    createdAt INTEGER NOT NULL,
                    message TEXT NOT NULL,
                    source TEXT NOT NULL,
                    level TEXT NOT NULL,
                    payload TEXT
               )
            """.trimIndent()
        )
        db.execSQL(
            """
               INSERT INTO LogLine_new (id, createdAt, message, source, level, payload)
               SELECT
                    id,
                    createdAt,
                    message,
                    'SDK',
                    CASE WHEN type = 'ERROR' THEN 'ERROR' ELSE 'INFO' END,
                    CASE
                         WHEN type = 'CHECKOUT_COMPLETED' THEN checkout_completedorderDetails
                         WHEN type = 'ERROR' AND error_detailstype IS NOT NULL
                              THEN error_detailstype || ': ' || error_detailsmessage
                         WHEN type = 'ERROR' THEN error_detailsmessage
                         ELSE NULL
                    END
               FROM LogLine
               WHERE type IN ('STANDARD', 'ERROR', 'CHECKOUT_COMPLETED')
            """.trimIndent()
        )
        db.execSQL("DROP TABLE LogLine")
        db.execSQL("ALTER TABLE LogLine_new RENAME TO LogLine")
    }
}
