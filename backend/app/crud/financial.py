# app/crud/financial.py
"""CRUD operations for Financial models."""
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from datetime import datetime, date, timedelta
from decimal import Decimal
import uuid

from app.crud.base import CRUDBase
from app.common.models.financial import (
    ChargeItem, ChargeItemModifier, PatientAccount,
    Bill, Payment, FinancialTransaction,
    ChargeItemStatus, BillStatus, PaymentStatus,
    PaymentMethod, DiscountType
)


class CRUDChargeItem(CRUDBase[ChargeItem, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for ChargeItem model."""
    
    def create_charge(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID,
        service_code: str,
        service_name: str,
        unit_price: Decimal,
        quantity: Decimal = Decimal("1.0"),
        entered_by: uuid.UUID,
        **kwargs
    ) -> ChargeItem:
        """Create a new charge item."""
        gross_amount = unit_price * quantity
        net_amount = gross_amount  # Will be adjusted by modifiers
        
        charge = ChargeItem(
            id=uuid.uuid4(),
            patient_id=patient_id,
            service_code=service_code,
            service_name=service_name,
            unit_price=unit_price,
            quantity=quantity,
            gross_amount=gross_amount,
            net_amount=net_amount,
            entered_by=entered_by,
            status=ChargeItemStatus.PLANNED,
            occurrence_date=datetime.utcnow(),
            code={"coding": [{"system": "internal", "code": service_code}]},
            **kwargs
        )
        
        db.add(charge)
        db.commit()
        db.refresh(charge)
        return charge
    
    def get_patient_charges(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID,
        status: Optional[ChargeItemStatus] = None,
        is_billed: Optional[bool] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[ChargeItem]:
        """Get charges for a patient."""
        query = db.query(ChargeItem).filter(
            ChargeItem.patient_id == patient_id
        )
        
        if status:
            query = query.filter(ChargeItem.status == status)
        
        if is_billed is not None:
            query = query.filter(ChargeItem.is_billed == is_billed)
        
        if date_from:
            query = query.filter(ChargeItem.occurrence_date >= date_from)
        
        if date_to:
            query = query.filter(ChargeItem.occurrence_date <= date_to)
        
        return query.order_by(desc(ChargeItem.occurrence_date)).offset(skip).limit(limit).all()
    
    def apply_discount(
        self,
        db: Session,
        *,
        charge_id: uuid.UUID,
        discount_type: DiscountType,
        percentage: Optional[Decimal] = None,
        amount: Optional[Decimal] = None,
        authorized_by: uuid.UUID,
        reason: str
    ) -> Optional[ChargeItem]:
        """Apply discount to a charge item."""
        charge = self.get(db, id=charge_id)
        if not charge:
            return None
        
        # Create modifier
        modifier = ChargeItemModifier(
            id=uuid.uuid4(),
            charge_item_id=charge_id,
            modifier_type=discount_type,
            description=f"Discount: {reason}",
            percentage=percentage,
            amount=amount,
            authorized_by=authorized_by,
            reason=reason
        )
        
        db.add(modifier)
        
        # Calculate discount amount
        if percentage:
            discount_amount = charge.gross_amount * (percentage / 100)
        else:
            discount_amount = amount or Decimal("0")
        
        # Update charge
        charge.discount_amount += discount_amount
        charge.net_amount = charge.gross_amount - charge.discount_amount + charge.tax_amount
        charge.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(charge)
        return charge
    
    def update_status(
        self,
        db: Session,
        *,
        charge_id: uuid.UUID,
        status: ChargeItemStatus
    ) -> Optional[ChargeItem]:
        """Update charge item status."""
        charge = self.get(db, id=charge_id)
        if charge:
            charge.status = status
            charge.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(charge)
        return charge
    
    def mark_as_billed(
        self,
        db: Session,
        *,
        charge_id: uuid.UUID,
        bill_id: uuid.UUID
    ) -> Optional[ChargeItem]:
        """Mark charge as billed."""
        charge = self.get(db, id=charge_id)
        if charge:
            charge.is_billed = True
            charge.billed_date = datetime.utcnow()
            charge.bill_id = bill_id
            charge.status = ChargeItemStatus.BILLED
            charge.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(charge)
        return charge


class CRUDPatientAccount(CRUDBase[PatientAccount, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for PatientAccount model."""
    
    def get_by_account_number(
        self, db: Session, *, account_number: str
    ) -> Optional[PatientAccount]:
        """Get account by account number."""
        return db.query(PatientAccount).filter(
            PatientAccount.account_number == account_number
        ).first()
    
    def get_patient_account(
        self, db: Session, *, patient_id: uuid.UUID
    ) -> Optional[PatientAccount]:
        """Get primary account for a patient."""
        return db.query(PatientAccount).filter(
            and_(
                PatientAccount.patient_id == patient_id,
                PatientAccount.account_type == "patient",
                PatientAccount.status == "active"
            )
        ).first()
    
    def create_patient_account(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID,
        name: str,
        **kwargs
    ) -> PatientAccount:
        """Create a new patient account."""
        # Generate account number
        account_number = f"PA{datetime.utcnow().strftime('%Y%m%d')}{uuid.uuid4().hex[:6].upper()}"
        
        account = PatientAccount(
            id=uuid.uuid4(),
            patient_id=patient_id,
            account_number=account_number,
            name=name,
            account_type="patient",
            status="active",
            **kwargs
        )
        
        db.add(account)
        db.commit()
        db.refresh(account)
        return account
    
    def update_balance(
        self,
        db: Session,
        *,
        account_id: uuid.UUID
    ) -> Optional[PatientAccount]:
        """Recalculate and update account balance."""
        account = self.get(db, id=account_id)
        if not account:
            return None
        
        # Calculate total charges
        total_charges = db.query(
            func.sum(ChargeItem.net_amount)
        ).filter(
            and_(
                ChargeItem.account_id == account_id,
                ChargeItem.status != ChargeItemStatus.ENTERED_IN_ERROR
            )
        ).scalar() or Decimal("0")
        
        # Calculate total payments
        total_payments = db.query(
            func.sum(Payment.amount)
        ).join(Bill).filter(
            and_(
                Bill.account_id == account_id,
                Payment.status == PaymentStatus.COMPLETED
            )
        ).scalar() or Decimal("0")
        
        # Update account
        account.total_charges = total_charges
        account.total_payments = total_payments
        account.current_balance = total_charges - total_payments - account.total_adjustments
        account.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(account)
        return account
    
    def get_account_statement(
        self,
        db: Session,
        *,
        account_id: uuid.UUID,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> Dict[str, Any]:
        """Get account statement with transactions."""
        account = self.get(db, id=account_id)
        if not account:
            return {}
        
        # Get transactions
        query = db.query(FinancialTransaction).filter(
            FinancialTransaction.account_id == account_id
        )
        
        if date_from:
            query = query.filter(FinancialTransaction.transaction_date >= date_from)
        
        if date_to:
            query = query.filter(FinancialTransaction.transaction_date <= date_to)
        
        transactions = query.order_by(desc(FinancialTransaction.transaction_date)).all()
        
        return {
            "account": account,
            "transactions": transactions,
            "period": {
                "from": date_from,
                "to": date_to
            },
            "summary": {
                "total_charges": account.total_charges,
                "total_payments": account.total_payments,
                "total_adjustments": account.total_adjustments,
                "current_balance": account.current_balance
            }
        }


class CRUDBill(CRUDBase[Bill, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for Bill model."""
    
    def get_by_bill_number(
        self, db: Session, *, bill_number: str
    ) -> Optional[Bill]:
        """Get bill by bill number."""
        return db.query(Bill).filter(Bill.bill_number == bill_number).first()
    
    def create_bill(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID,
        account_id: uuid.UUID,
        charge_ids: List[uuid.UUID],
        due_days: int = 30,
        created_by: uuid.UUID
    ) -> Bill:
        """Create a bill from charge items."""
        # Get charges
        charges = db.query(ChargeItem).filter(
            and_(
                ChargeItem.id.in_(charge_ids),
                ChargeItem.is_billed == False
            )
        ).all()
        
        if not charges:
            raise ValueError("No unbilled charges found")
        
        # Calculate totals
        total_charges = sum(c.net_amount for c in charges)
        total_discounts = sum(c.discount_amount for c in charges)
        total_tax = sum(c.tax_amount for c in charges)
        
        # Determine service period
        service_dates = [c.occurrence_date for c in charges]
        service_period_start = min(service_dates).date()
        service_period_end = max(service_dates).date()
        
        # Generate bill number
        bill_number = f"BILL{datetime.utcnow().strftime('%Y%m%d')}{uuid.uuid4().hex[:6].upper()}"
        
        # Create bill
        bill = Bill(
            id=uuid.uuid4(),
            patient_id=patient_id,
            account_id=account_id,
            bill_number=bill_number,
            bill_date=date.today(),
            due_date=date.today() + timedelta(days=due_days),
            bill_type="service",
            service_period_start=service_period_start,
            service_period_end=service_period_end,
            status=BillStatus.DRAFT,
            total_charges=total_charges,
            total_discounts=total_discounts,
            total_tax=total_tax,
            total_amount=total_charges,
            balance_due=total_charges,
            created_by=created_by
        )
        
        db.add(bill)
        
        # Mark charges as billed
        for charge in charges:
            charge.is_billed = True
            charge.billed_date = datetime.utcnow()
            charge.bill_id = bill.id
            charge.status = ChargeItemStatus.BILLED
        
        db.commit()
        db.refresh(bill)
        return bill
    
    def get_patient_bills(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID,
        status: Optional[BillStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Bill]:
        """Get bills for a patient."""
        query = db.query(Bill).filter(Bill.patient_id == patient_id)
        
        if status:
            query = query.filter(Bill.status == status)
        
        return query.order_by(desc(Bill.bill_date)).offset(skip).limit(limit).all()
    
    def submit_bill(
        self,
        db: Session,
        *,
        bill_id: uuid.UUID,
        submitted_by: uuid.UUID
    ) -> Optional[Bill]:
        """Submit bill for payment."""
        bill = self.get(db, id=bill_id)
        if bill and bill.status == BillStatus.DRAFT:
            bill.status = BillStatus.SUBMITTED
            bill.submitted_date = date.today()
            bill.submitted_by = submitted_by
            bill.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(bill)
        return bill
    
    def update_bill_status(
        self,
        db: Session,
        *,
        bill_id: uuid.UUID,
        status: BillStatus
    ) -> Optional[Bill]:
        """Update bill status."""
        bill = self.get(db, id=bill_id)
        if bill:
            bill.status = status
            bill.updated_at = datetime.utcnow()
            
            # Update related fields based on status
            if status == BillStatus.PAID:
                bill.balance_due = Decimal("0")
            elif status == BillStatus.CANCELLED:
                bill.cancelled_date = datetime.utcnow()
            
            db.commit()
            db.refresh(bill)
        return bill
    
    def apply_payment_to_bill(
        self,
        db: Session,
        *,
        bill_id: uuid.UUID,
        payment_amount: Decimal
    ) -> Optional[Bill]:
        """Apply payment to bill and update balance."""
        bill = self.get(db, id=bill_id)
        if not bill:
            return None
        
        bill.paid_amount += payment_amount
        bill.balance_due = bill.total_amount - bill.paid_amount
        
        # Update status based on payment
        if bill.balance_due <= 0:
            bill.status = BillStatus.PAID
        elif bill.paid_amount > 0:
            bill.status = BillStatus.PARTIAL
        
        bill.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(bill)
        return bill
    
    def get_overdue_bills(
        self,
        db: Session,
        *,
        days_overdue: int = 0,
        skip: int = 0,
        limit: int = 100
    ) -> List[Bill]:
        """Get overdue bills."""
        cutoff_date = date.today() - timedelta(days=days_overdue)
        
        return db.query(Bill).filter(
            and_(
                Bill.status.in_([BillStatus.SUBMITTED, BillStatus.PARTIAL]),
                Bill.due_date <= cutoff_date,
                Bill.balance_due > 0
            )
        ).order_by(Bill.due_date).offset(skip).limit(limit).all()


class CRUDPayment(CRUDBase[Payment, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for Payment model."""
    
    def get_by_payment_number(
        self, db: Session, *, payment_number: str
    ) -> Optional[Payment]:
        """Get payment by payment number."""
        return db.query(Payment).filter(
            Payment.payment_number == payment_number
        ).first()
    
    def create_payment(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID,
        amount: Decimal,
        payment_method: PaymentMethod,
        received_by: uuid.UUID,
        bill_id: Optional[uuid.UUID] = None,
        **kwargs
    ) -> Payment:
        """Create a new payment."""
        # Generate payment number
        payment_number = f"PAY{datetime.utcnow().strftime('%Y%m%d')}{uuid.uuid4().hex[:6].upper()}"
        
        # Generate receipt number
        receipt_number = f"RCP{datetime.utcnow().strftime('%Y%m%d')}{uuid.uuid4().hex[:6].upper()}"
        
        payment = Payment(
            id=uuid.uuid4(),
            patient_id=patient_id,
            bill_id=bill_id,
            payment_number=payment_number,
            payment_date=datetime.utcnow(),
            amount=amount,
            payment_method=payment_method,
            status=PaymentStatus.PENDING,
            received_by=received_by,
            receipt_number=receipt_number,
            **kwargs
        )
        
        db.add(payment)
        db.commit()
        db.refresh(payment)
        return payment
    
    def process_payment(
        self,
        db: Session,
        *,
        payment_id: uuid.UUID,
        processor_reference: Optional[str] = None
    ) -> Optional[Payment]:
        """Process a payment."""
        payment = self.get(db, id=payment_id)
        if not payment:
            return None
        
        payment.status = PaymentStatus.COMPLETED
        payment.processed_date = datetime.utcnow()
        payment.processor_reference = processor_reference
        payment.updated_at = datetime.utcnow()
        
        # If payment is for a bill, update the bill
        if payment.bill_id:
            bill_crud = CRUDBill(Bill)
            bill_crud.apply_payment_to_bill(
                db,
                bill_id=payment.bill_id,
                payment_amount=payment.amount
            )
        
        # Create financial transaction
        if payment.bill_id:
            bill = db.query(Bill).get(payment.bill_id)
            if bill:
                transaction = FinancialTransaction(
                    id=uuid.uuid4(),
                    account_id=bill.account_id,
                    transaction_date=datetime.utcnow(),
                    transaction_type="payment",
                    payment_id=payment.id,
                    credit_amount=payment.amount,
                    running_balance=Decimal("0"),  # Would be calculated
                    description=f"Payment {payment.payment_number}",
                    reference_number=payment.payment_number,
                    posted_by=payment.received_by
                )
                db.add(transaction)
        
        db.commit()
        db.refresh(payment)
        return payment
    
    def refund_payment(
        self,
        db: Session,
        *,
        payment_id: uuid.UUID,
        refund_amount: Decimal,
        refund_reason: str
    ) -> Optional[Payment]:
        """Refund a payment (partial or full)."""
        payment = self.get(db, id=payment_id)
        if not payment or payment.status != PaymentStatus.COMPLETED:
            return None
        
        # Validate refund amount
        if refund_amount > (payment.amount - payment.refunded_amount):
            raise ValueError("Refund amount exceeds available amount")
        
        payment.refunded_amount += refund_amount
        payment.refund_date = datetime.utcnow()
        payment.refund_reason = refund_reason
        
        if payment.refunded_amount >= payment.amount:
            payment.status = PaymentStatus.REFUNDED
            payment.is_refunded = True
        else:
            payment.status = PaymentStatus.PARTIAL_REFUND
        
        payment.updated_at = datetime.utcnow()
        
        # Create refund transaction
        if payment.bill_id:
            bill = db.query(Bill).get(payment.bill_id)
            if bill:
                transaction = FinancialTransaction(
                    id=uuid.uuid4(),
                    account_id=bill.account_id,
                    transaction_date=datetime.utcnow(),
                    transaction_type="refund",
                    payment_id=payment.id,
                    debit_amount=refund_amount,
                    running_balance=Decimal("0"),  # Would be calculated
                    description=f"Refund for payment {payment.payment_number}",
                    reference_number=payment.payment_number,
                    posted_by=payment.received_by
                )
                db.add(transaction)
                
                # Update bill balance
                bill.paid_amount -= refund_amount
                bill.balance_due += refund_amount
                if bill.balance_due > 0:
                    bill.status = BillStatus.PARTIAL
        
        db.commit()
        db.refresh(payment)
        return payment
    
    def get_patient_payments(
        self,
        db: Session,
        *,
        patient_id: uuid.UUID,
        status: Optional[PaymentStatus] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Payment]:
        """Get payments for a patient."""
        query = db.query(Payment).filter(Payment.patient_id == patient_id)
        
        if status:
            query = query.filter(Payment.status == status)
        
        if date_from:
            query = query.filter(Payment.payment_date >= date_from)
        
        if date_to:
            query = query.filter(Payment.payment_date <= date_to)
        
        return query.order_by(desc(Payment.payment_date)).offset(skip).limit(limit).all()


class CRUDFinancialTransaction(CRUDBase[FinancialTransaction, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for FinancialTransaction model."""
    
    def create_transaction(
        self,
        db: Session,
        *,
        account_id: uuid.UUID,
        transaction_type: str,
        description: str,
        posted_by: uuid.UUID,
        debit_amount: Decimal = Decimal("0"),
        credit_amount: Decimal = Decimal("0"),
        **kwargs
    ) -> FinancialTransaction:
        """Create a financial transaction and update account balance."""
        # Get current balance
        last_transaction = db.query(FinancialTransaction).filter(
            FinancialTransaction.account_id == account_id
        ).order_by(desc(FinancialTransaction.transaction_date)).first()
        
        previous_balance = last_transaction.running_balance if last_transaction else Decimal("0")
        running_balance = previous_balance + credit_amount - debit_amount
        
        transaction = FinancialTransaction(
            id=uuid.uuid4(),
            account_id=account_id,
            transaction_date=datetime.utcnow(),
            transaction_type=transaction_type,
            debit_amount=debit_amount,
            credit_amount=credit_amount,
            running_balance=running_balance,
            description=description,
            posted_by=posted_by,
            **kwargs
        )
        
        db.add(transaction)
        
        # Update account balance
        account = db.query(PatientAccount).get(account_id)
        if account:
            account.current_balance = running_balance
            account.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(transaction)
        return transaction
    
    def get_account_transactions(
        self,
        db: Session,
        *,
        account_id: uuid.UUID,
        transaction_type: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[FinancialTransaction]:
        """Get transactions for an account."""
        query = db.query(FinancialTransaction).filter(
            FinancialTransaction.account_id == account_id
        )
        
        if transaction_type:
            query = query.filter(FinancialTransaction.transaction_type == transaction_type)
        
        if date_from:
            query = query.filter(FinancialTransaction.transaction_date >= date_from)
        
        if date_to:
            query = query.filter(FinancialTransaction.transaction_date <= date_to)
        
        return query.order_by(desc(FinancialTransaction.transaction_date)).offset(skip).limit(limit).all()
    
    def reverse_transaction(
        self,
        db: Session,
        *,
        transaction_id: uuid.UUID,
        reversal_reason: str,
        posted_by: uuid.UUID
    ) -> Optional[FinancialTransaction]:
        """Reverse a financial transaction."""
        original = self.get(db, id=transaction_id)
        if not original or original.is_reversed:
            return None
        
        # Create reversal transaction
        reversal = self.create_transaction(
            db,
            account_id=original.account_id,
            transaction_type="reversal",
            description=f"Reversal of transaction {original.id}: {reversal_reason}",
            posted_by=posted_by,
            debit_amount=original.credit_amount,  # Reverse the amounts
            credit_amount=original.debit_amount,
            reference_number=f"REV-{original.id}"
        )
        
        # Mark original as reversed
        original.is_reversed = True
        original.reversed_by_id = reversal.id
        original.reversal_reason = reversal_reason
        
        db.commit()
        db.refresh(original)
        return reversal
    
    def get_account_balance_history(
        self,
        db: Session,
        *,
        account_id: uuid.UUID,
        date_from: date,
        date_to: date
    ) -> List[Dict[str, Any]]:
        """Get daily balance history for an account."""
        transactions = self.get_account_transactions(
            db,
            account_id=account_id,
            date_from=date_from,
            date_to=date_to,
            limit=1000  # Adjust as needed
        )
        
        # Group by date and get closing balance
        balance_history = []
        current_date = date_from
        
        while current_date <= date_to:
            day_transactions = [
                t for t in transactions
                if t.transaction_date.date() == current_date
            ]
            
            if day_transactions:
                closing_balance = day_transactions[-1].running_balance
            else:
                # Get last balance before this date
                last_transaction = db.query(FinancialTransaction).filter(
                    and_(
                        FinancialTransaction.account_id == account_id,
                        FinancialTransaction.transaction_date < current_date
                    )
                ).order_by(desc(FinancialTransaction.transaction_date)).first()
                
                closing_balance = last_transaction.running_balance if last_transaction else Decimal("0")
            
            balance_history.append({
                "date": current_date,
                "closing_balance": closing_balance,
                "transaction_count": len(day_transactions)
            })
            
            current_date += timedelta(days=1)
        
        return balance_history


# Create instances
charge_item = CRUDChargeItem(ChargeItem)
patient_account = CRUDPatientAccount(PatientAccount)
bill = CRUDBill(Bill)
payment = CRUDPayment(Payment)
financial_transaction = CRUDFinancialTransaction(FinancialTransaction)