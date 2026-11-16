-- Для уже созданной базы: списание остатка при статусе completed.
-- Приложение также добавляет колонку автоматически при первой смене статуса.
-- Вторую команду выполнять только для старых заказов, созданных до этого изменения,
-- где остаток уже был списан при оплате.
USE stroymarket;

ALTER TABLE orders ADD COLUMN stock_deducted TINYINT(1) NOT NULL DEFAULT 0;
UPDATE orders SET stock_deducted = 1 WHERE payment_status = 'paid';
