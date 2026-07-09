package com.galaxium.holdservice.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.Types;

import static org.assertj.core.api.Assertions.assertThat;

class SQLiteDialectTest {

    private SQLiteDialect dialect;

    @BeforeEach
    void setUp() {
        dialect = new SQLiteDialect();
    }

    // -------------------------------------------------------------------------
    // Column type registrations (constructor)
    // -------------------------------------------------------------------------

    @Test
    void shouldMapBitToInteger() throws Exception {
        assertThat(dialect.getTypeName(Types.BIT)).isEqualTo("integer");
    }

    @Test
    void shouldMapTinyintToTinyint() throws Exception {
        assertThat(dialect.getTypeName(Types.TINYINT)).isEqualTo("tinyint");
    }

    @Test
    void shouldMapSmallintToSmallint() throws Exception {
        assertThat(dialect.getTypeName(Types.SMALLINT)).isEqualTo("smallint");
    }

    @Test
    void shouldMapIntegerToInteger() throws Exception {
        assertThat(dialect.getTypeName(Types.INTEGER)).isEqualTo("integer");
    }

    @Test
    void shouldMapBigintToBigint() throws Exception {
        assertThat(dialect.getTypeName(Types.BIGINT)).isEqualTo("bigint");
    }

    @Test
    void shouldMapFloatToFloat() throws Exception {
        assertThat(dialect.getTypeName(Types.FLOAT)).isEqualTo("float");
    }

    @Test
    void shouldMapRealToReal() throws Exception {
        assertThat(dialect.getTypeName(Types.REAL)).isEqualTo("real");
    }

    @Test
    void shouldMapDoubleToDouble() throws Exception {
        assertThat(dialect.getTypeName(Types.DOUBLE)).isEqualTo("double");
    }

    @Test
    void shouldMapNumericToNumeric() throws Exception {
        assertThat(dialect.getTypeName(Types.NUMERIC)).isEqualTo("numeric");
    }

    @Test
    void shouldMapDecimalToDecimal() throws Exception {
        assertThat(dialect.getTypeName(Types.DECIMAL)).isEqualTo("decimal");
    }

    @Test
    void shouldMapCharToChar() throws Exception {
        assertThat(dialect.getTypeName(Types.CHAR)).isEqualTo("char");
    }

    @Test
    void shouldMapVarcharToVarchar() throws Exception {
        assertThat(dialect.getTypeName(Types.VARCHAR)).isEqualTo("varchar");
    }

    @Test
    void shouldMapLongvarcharToLongvarchar() throws Exception {
        assertThat(dialect.getTypeName(Types.LONGVARCHAR)).isEqualTo("longvarchar");
    }

    @Test
    void shouldMapDateToDate() throws Exception {
        assertThat(dialect.getTypeName(Types.DATE)).isEqualTo("date");
    }

    @Test
    void shouldMapTimeToTime() throws Exception {
        assertThat(dialect.getTypeName(Types.TIME)).isEqualTo("time");
    }

    @Test
    void shouldMapTimestampToTimestamp() throws Exception {
        assertThat(dialect.getTypeName(Types.TIMESTAMP)).isEqualTo("timestamp");
    }

    @Test
    void shouldMapBinaryToBlob() throws Exception {
        assertThat(dialect.getTypeName(Types.BINARY)).isEqualTo("blob");
    }

    @Test
    void shouldMapVarbinaryToBlob() throws Exception {
        assertThat(dialect.getTypeName(Types.VARBINARY)).isEqualTo("blob");
    }

    @Test
    void shouldMapLongvarbinaryToBlob() throws Exception {
        assertThat(dialect.getTypeName(Types.LONGVARBINARY)).isEqualTo("blob");
    }

    @Test
    void shouldMapBlobToBlob() throws Exception {
        assertThat(dialect.getTypeName(Types.BLOB)).isEqualTo("blob");
    }

    @Test
    void shouldMapClobToClob() throws Exception {
        assertThat(dialect.getTypeName(Types.CLOB)).isEqualTo("clob");
    }

    @Test
    void shouldMapBooleanToInteger() throws Exception {
        assertThat(dialect.getTypeName(Types.BOOLEAN)).isEqualTo("integer");
    }

    // -------------------------------------------------------------------------
    // Overridden dialect behaviour
    // -------------------------------------------------------------------------

    @Test
    void shouldReturnSQLiteIdentityColumnSupport() {
        assertThat(dialect.getIdentityColumnSupport())
                .isInstanceOf(SQLiteDialect.SQLiteIdentityColumnSupport.class);
    }

    @Test
    void shouldNotHaveAlterTable() {
        assertThat(dialect.hasAlterTable()).isFalse();
    }

    @Test
    void shouldNotDropConstraints() {
        assertThat(dialect.dropConstraints()).isFalse();
    }

    @Test
    void shouldReturnEmptyDropForeignKeyString() {
        assertThat(dialect.getDropForeignKeyString()).isEmpty();
    }

    @Test
    void shouldReturnEmptyAddForeignKeyConstraintString() {
        String result = dialect.getAddForeignKeyConstraintString(
                "fk_test",
                new String[]{"flight_id"},
                "flights",
                new String[]{"id"},
                true
        );
        assertThat(result).isEmpty();
    }

    @Test
    void shouldReturnEmptyAddPrimaryKeyConstraintString() {
        assertThat(dialect.getAddPrimaryKeyConstraintString("pk_test")).isEmpty();
    }

    @Test
    void shouldReturnEmptyForUpdateString() {
        assertThat(dialect.getForUpdateString()).isEmpty();
    }

    @Test
    void shouldReturnAddColumnString() {
        assertThat(dialect.getAddColumnString()).isEqualTo("add column");
    }

    @Test
    void shouldSupportIfExistsBeforeTableName() {
        assertThat(dialect.supportsIfExistsBeforeTableName()).isTrue();
    }

    @Test
    void shouldNotSupportCascadeDelete() {
        assertThat(dialect.supportsCascadeDelete()).isFalse();
    }

    // -------------------------------------------------------------------------
    // SQLiteIdentityColumnSupport inner class
    // -------------------------------------------------------------------------

    @Test
    void identityColumnSupport_shouldSupportIdentityColumns() {
        SQLiteDialect.SQLiteIdentityColumnSupport support =
                new SQLiteDialect.SQLiteIdentityColumnSupport();
        assertThat(support.supportsIdentityColumns()).isTrue();
    }

    @Test
    void identityColumnSupport_shouldReturnLastInsertRowidSelectString() {
        SQLiteDialect.SQLiteIdentityColumnSupport support =
                new SQLiteDialect.SQLiteIdentityColumnSupport();
        assertThat(support.getIdentitySelectString("holds", "id", Types.INTEGER))
                .isEqualTo("select last_insert_rowid()");
    }

    @Test
    void identityColumnSupport_shouldReturnIntegerColumnString() {
        SQLiteDialect.SQLiteIdentityColumnSupport support =
                new SQLiteDialect.SQLiteIdentityColumnSupport();
        assertThat(support.getIdentityColumnString(Types.INTEGER)).isEqualTo("integer");
    }

    @Test
    void identityColumnSupport_shouldReturnIntegerColumnString_forBigintType() {
        SQLiteDialect.SQLiteIdentityColumnSupport support =
                new SQLiteDialect.SQLiteIdentityColumnSupport();
        assertThat(support.getIdentityColumnString(Types.BIGINT)).isEqualTo("integer");
    }

    @Test
    void identityColumnSupport_shouldReturnLastInsertRowid_forAnyTableAndColumn() {
        SQLiteDialect.SQLiteIdentityColumnSupport support =
                new SQLiteDialect.SQLiteIdentityColumnSupport();
        assertThat(support.getIdentitySelectString("quotes", "quote_id", Types.BIGINT))
                .isEqualTo("select last_insert_rowid()");
    }
}
