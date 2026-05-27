from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from app.models import BookStatus, ImageRole, FooterItemType


class ArtistBase(BaseModel):
    name: str
    country: str | None = None
    instagram: str | None = None
    website: str | None = None
    bio: str | None = None


class ArtistCreate(ArtistBase):
    pass


class ArtistUpdate(ArtistBase):
    pass


class ArtistOut(ArtistBase):
    id: int
    slug: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ArtistListOut(ArtistOut):
    book_count: int = 0


class TagOut(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)


class TagCreate(BaseModel):
    name: str


class TagUpdate(BaseModel):
    name: str


class BookImageOut(BaseModel):
    id: int
    filename: str
    original_url: str | None
    role: ImageRole
    sort_order: int
    width: int | None
    height: int | None
    model_config = ConfigDict(from_attributes=True)


class BookLinkBase(BaseModel):
    url: str
    label: str | None = None
    sort_order: int = 0


class BookLinkCreate(BookLinkBase):
    pass


class BookLinkUpdate(BookLinkBase):
    pass


class BookLinkOut(BookLinkBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class BookBase(BaseModel):
    title: str
    artist_id: int
    publisher: str | None = None
    year: int | None = None
    edition: str | None = None
    language: str | None = None
    isbn: str | None = None
    signed: bool = False
    numbered: bool = False
    print_run: int | None = None
    copy_number: int | None = None
    status: BookStatus = BookStatus.owned
    hidden: bool = False
    acquisition_year: int | None = None
    price_paid: Decimal | None = None
    description: str | None = None
    colophon: str | None = None
    notes: str | None = None


class BookCreate(BookBase):
    tag_ids: list[int] = []


class BookUpdate(BookBase):
    tag_ids: list[int] = []


class BookOut(BookBase):
    id: int
    slug: str
    artist: ArtistOut
    tags: list[TagOut]
    images: list[BookImageOut]
    links: list[BookLinkOut]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PageBase(BaseModel):
    slug: str
    title: str
    body: str = ""


class PageCreate(PageBase):
    pass


class PageUpdate(PageBase):
    pass


class PageOut(PageBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class FooterItemBase(BaseModel):
    type: FooterItemType
    label: str
    url: str | None = None
    sort_order: int = 0


class FooterItemCreate(FooterItemBase):
    pass


class FooterItemUpdate(FooterItemBase):
    pass


class FooterItemOut(FooterItemBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class ReorderBody(BaseModel):
    ids: list[int]
