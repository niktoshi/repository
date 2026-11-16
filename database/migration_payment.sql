-- Для уже созданной базы: колонки фейковой оплаты в таблице orders.
-- Приложение также добавляет их автоматически при первой оплате,
-- этот файл нужен, только если хотите обновить базу вручную.
USE stroymarket;

ALTER TABLE orders ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN payment_method VARCHAR(30) NULL;
ALTER TABLE orders ADD COLUMN card_last4 VARCHAR(4) NULL;
