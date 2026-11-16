USE stroymarket;

-- Администратор (логин: admin@stroymarket.ru, пароль: Admin123!)
-- Пароль хранится как bcrypt-хэш, менять его напрямую в SQL нельзя.
INSERT INTO users (name, email, password_hash, role) VALUES
('Администратор', 'admin@stroymarket.ru', '$2a$10$IAzQ91fhjayKofmeSDTJruRhsCOmz8NL8b4s255KkWJHnehY/51Fu', 'admin')
ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), role = VALUES(role);

INSERT INTO products (name, description, price, stock, category_id) VALUES
('Цемент М500, 50 кг', 'Портландцемент для кладки и стяжки', 450.00, 120, 1),
('Кирпич красный М150', 'Полнотелый керамический кирпич', 18.50, 5000, 2),
('Доска обрезная 50x150, 6 м', 'Хвойная доска камерной сушки', 950.00, 80, 3),
('Арматура А500С, 12 мм', 'Стальная арматура, пруток 11,7 м', 720.00, 200, 4),
('Перфоратор 800 Вт', 'Перфоратор с патроном SDS-plus', 5490.00, 15, 5),
('Штукатурка гипсовая, 30 кг', 'Для выравнивания стен внутри помещений', 390.00, 60, 1);
