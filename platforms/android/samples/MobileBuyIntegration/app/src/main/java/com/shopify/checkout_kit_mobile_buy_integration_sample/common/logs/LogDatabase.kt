/*
 * MIT License
 * 
 * Copyright 2023-present, Shopify Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
package com.shopify.checkout_kit_mobile_buy_integration_sample.common.logs

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
