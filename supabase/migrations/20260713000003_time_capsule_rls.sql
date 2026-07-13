-- Políticas RLS para time_capsule_messages
-- Membros do mesmo casal podem ler, o criador pode inserir/apagar, qualquer membro pode actualizar (unlock)
create policy tcm_select on time_capsule_messages for select using (
  couple_space_id in (select couple_space_id from members where user_id = auth.uid())
);

create policy tcm_insert on time_capsule_messages for insert to authenticated with check (
  creator_id = auth.uid()
  and couple_space_id in (select couple_space_id from members where user_id = auth.uid())
);

create policy tcm_update on time_capsule_messages for update using (
  couple_space_id in (select couple_space_id from members where user_id = auth.uid())
);

create policy tcm_delete on time_capsule_messages for delete using (
  creator_id = auth.uid()
);
