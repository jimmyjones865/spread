import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, Text, Numeric,
    DateTime, Enum, ForeignKey,
)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


class BookStatus(str, enum.Enum):
    owned = "owned"
    on_order = "on_order"
    wishlist = "wishlist"


class ImageRole(str, enum.Enum):
    cover = "cover"
    spread = "spread"


class FooterItemType(str, enum.Enum):
    link = "link"
    text = "text"


class Artist(Base):
    __tablename__ = "artists"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False, unique=True)
    country = Column(String, nullable=True)
    instagram = Column(String, nullable=True)
    website = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    books = relationship("Book", back_populates="artist")


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    slug = Column(String, nullable=False, unique=True)
    artist_id = Column(Integer, ForeignKey("artists.id"), nullable=False)
    publisher = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    edition = Column(String, nullable=True)
    language = Column(String, nullable=True)
    isbn = Column(String, nullable=True)
    signed = Column(Boolean, default=False, nullable=False)
    numbered = Column(Boolean, default=False, nullable=False)
    print_run = Column(Integer, nullable=True)
    copy_number = Column(Integer, nullable=True)
    status = Column(Enum(BookStatus), default=BookStatus.owned, nullable=False)
    hidden = Column(Boolean, default=False, nullable=False)
    acquisition_year = Column(Integer, nullable=True)
    price_paid = Column(Numeric(10, 2), nullable=True)
    description = Column(Text, nullable=True)
    colophon = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    edition_year = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    artist = relationship("Artist", back_populates="books")
    images = relationship("BookImage", back_populates="book", cascade="all, delete-orphan", order_by="BookImage.sort_order")
    links = relationship("BookLink", back_populates="book", cascade="all, delete-orphan", order_by="BookLink.sort_order")
    tags = relationship("Tag", secondary="book_tags", back_populates="books")


class BookImage(Base):
    __tablename__ = "book_images"

    id = Column(Integer, primary_key=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    filename = Column(String, nullable=False)
    original_url = Column(String, nullable=True)
    role = Column(Enum(ImageRole), nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    file_size = Column(Integer, nullable=True)

    book = relationship("Book", back_populates="images")


class BookLink(Base):
    __tablename__ = "book_links"

    id = Column(Integer, primary_key=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    url = Column(String, nullable=False)
    label = Column(String, nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)

    book = relationship("Book", back_populates="links")


class RawScrape(Base):
    __tablename__ = "raw_scrapes"

    id = Column(Integer, primary_key=True)
    url = Column(String, nullable=False, unique=True)
    scraped_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    content = Column(Text, nullable=False)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="SET NULL"), nullable=True)


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, unique=True)

    books = relationship("Book", secondary="book_tags", back_populates="tags")


class BookTag(Base):
    __tablename__ = "book_tags"

    book_id = Column(Integer, ForeignKey("books.id"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), primary_key=True)


class Page(Base):
    __tablename__ = "pages"

    id = Column(Integer, primary_key=True)
    slug = Column(String, nullable=False, unique=True)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class FooterItem(Base):
    __tablename__ = "footer_items"

    id = Column(Integer, primary_key=True)
    type = Column(Enum(FooterItemType), nullable=False)
    label = Column(String, nullable=False)
    url = Column(String, nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
