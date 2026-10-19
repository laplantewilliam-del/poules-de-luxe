-- Couleur d'affichage d'une laine (pastilles de couleur dans l'inventaire)
alter table yarns
  add column if not exists color_hex text
  check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$');
