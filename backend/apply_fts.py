import asyncio
from app.core.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE OR REPLACE FUNCTION update_document_search_vector()
            RETURNS trigger AS $$
            BEGIN
                NEW.search_vector :=
                    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
                    setweight(to_tsvector('simple', coalesce(NEW.content, '')), 'B');
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql;
        """))
        await conn.execute(text("DROP TRIGGER IF EXISTS trg_documents_search_vector ON documents;"))
        await conn.execute(text("""
            CREATE TRIGGER trg_documents_search_vector
            BEFORE INSERT OR UPDATE OF title, content
            ON documents
            FOR EACH ROW
            EXECUTE FUNCTION update_document_search_vector();
        """))
    print("Applied FTS trigger")

asyncio.run(main())
