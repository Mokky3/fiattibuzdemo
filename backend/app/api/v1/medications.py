"""
Medication search API endpoint.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import Optional, List
from decimal import Decimal

from app.db.session import get_db
from app.common.schemas.medications import (
    MedicationSearchResponse,
    MedicationProductResponse,
    MedicationPresentationResponse,
    MedicationPriceResponse,
    MNNResponse,
    DosageFormResponse,
    RouteResponse,
    UnitResponse,
    ManufacturerResponse,
    CategoryTagResponse,
)
from app.common.models.medication_ref import (
    MedicationProduct,
    MedicationPresentation,
    MedicationPrice,
    MNN,
    DosageForm,
    Route,
    Unit,
    Manufacturer,
    CategoryTag,
)

router = APIRouter(tags=["Medications"])


@router.get("/medications/search", response_model=MedicationSearchResponse)
def search_medications(
    q: Optional[str] = Query(None, description="Search query (brand name)"),
    mnn: Optional[str] = Query(None, description="Filter by MNN"),
    form: Optional[str] = Query(None, description="Filter by dosage form"),
    route: Optional[str] = Query(None, description="Filter by route"),
    rx: Optional[bool] = Query(None, description="Filter by prescription required"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(20, ge=1, le=100, description="Number of results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db),
):
    """
    Search medications with filters and full-text search.
    
    - **q**: Search query (searches brand_name_normalized with trigram similarity)
    - **mnn**: Filter by MNN name
    - **form**: Filter by dosage form name
    - **route**: Filter by route code
    - **rx**: Filter by prescription required (true/false)
    - **category**: Filter by category tag name
    - **limit**: Number of results (1-100)
    - **offset**: Offset for pagination
    """
    
    try:
        # Use SQLAlchemy ORM for proper relationship loading
        base_query = db.query(MedicationProduct).options(
            joinedload(MedicationProduct.mnn),
            joinedload(MedicationProduct.dosage_form),
            joinedload(MedicationProduct.route),
            joinedload(MedicationProduct.strength_unit),
            joinedload(MedicationProduct.manufacturer),
            joinedload(MedicationProduct.categories),
            joinedload(MedicationProduct.presentations).joinedload(MedicationPresentation.prices),
        )
        
        # Apply filters using ORM
        if q:
            q_normalized = q.lower().strip()
            base_query = base_query.filter(
                or_(
                    MedicationProduct.brand_name_normalized.contains(q_normalized),
                    MedicationProduct.brand_name.ilike(f"%{q_normalized}%"),
                )
            )
        
        if mnn:
            base_query = base_query.join(MNN).filter(MNN.name.ilike(f"%{mnn}%"))
        
        if form:
            base_query = base_query.join(DosageForm).filter(DosageForm.name.ilike(f"%{form}%"))
        
        if route:
            base_query = base_query.join(Route, MedicationProduct.route_id == Route.id).filter(Route.code == route)
        
        if rx is not None:
            base_query = base_query.filter(MedicationProduct.rx_required == rx)
        
        if category:
            base_query = base_query.join(CategoryTag).filter(CategoryTag.name.ilike(f"%{category}%"))
        
        # Get total count
        total = base_query.count()
        
        # Apply pagination and ordering
        if q:
            # Order by relevance: exact matches first, then partial matches
            q_normalized = q.lower().strip()
            products = base_query.order_by(
                # Prioritize exact matches
                (MedicationProduct.brand_name_normalized == q_normalized).desc(),
                # Then partial matches at start of name
                MedicationProduct.brand_name_normalized.startswith(q_normalized).desc(),
                # Then alphabetical
                MedicationProduct.brand_name
            ).offset(offset).limit(limit).all()
        else:
            products = base_query.order_by(MedicationProduct.brand_name).offset(offset).limit(limit).all()
        
        # Convert to response models
        product_responses = []
        for product in products:
            # Get cheapest retail price
            cheapest_price = None
            cheapest_currency = None
            
            for presentation in product.presentations:
                retail_prices = [p for p in presentation.prices if p.price_type == 'retail']
                if retail_prices:
                    min_price = min(retail_prices, key=lambda p: p.amount)
                    if cheapest_price is None or min_price.amount < cheapest_price:
                        cheapest_price = min_price.amount
                        cheapest_currency = min_price.currency
            
            # Build response
            product_response = MedicationProductResponse(
                id=product.id,
                pharm_id=product.pharm_id,
                brand_name=product.brand_name,
                registration_number=product.registration_number,
                mnn=MNNResponse(id=product.mnn.id, name=product.mnn.name) if product.mnn else None,
                dosage_form=DosageFormResponse(
                    id=product.dosage_form.id,
                    code=product.dosage_form.code,
                    name=product.dosage_form.name
                ) if product.dosage_form else None,
                route=RouteResponse(
                    id=product.route.id,
                    code=product.route.code,
                    name=product.route.name
                ) if product.route else None,
                strength_value=product.strength_value,
                strength_unit=UnitResponse(
                    id=product.strength_unit.id,
                    code=product.strength_unit.code,
                    name=product.strength_unit.name
                ) if product.strength_unit else None,
                manufacturer=ManufacturerResponse(
                    id=product.manufacturer.id,
                    name=product.manufacturer.name,
                    country=product.manufacturer.country
                ) if product.manufacturer else None,
                country_of_origin=product.country_of_origin,
                rx_required=product.rx_required,
                categories=[
                    CategoryTagResponse(id=cat.id, name=cat.name)
                    for cat in product.categories
                ],
                presentations=[
                    MedicationPresentationResponse(
                        id=pres.id,
                        pack_text=pres.pack_text,
                        items_per_pack=pres.items_per_pack,
                        pack_size_value=pres.pack_size_value,
                        gtin=pres.gtin,
                        prices=[
                            MedicationPriceResponse(
                                id=price.id,
                                price_type=price.price_type,
                                currency=price.currency,
                                amount=price.amount,
                                source=price.source,
                                noted_at=price.noted_at
                            )
                            for price in pres.prices
                        ]
                    )
                    for pres in product.presentations
                ],
                cheapest_retail_price=cheapest_price,
                cheapest_retail_currency=cheapest_currency,
                created_at=product.created_at,
                updated_at=product.updated_at,
            )
            product_responses.append(product_response)
        
        return MedicationSearchResponse(
            products=product_responses,
            total=total,
            limit=limit,
            offset=offset,
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

