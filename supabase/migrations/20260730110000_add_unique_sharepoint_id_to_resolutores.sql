do $$
begin
  if exists (
    select sharepoint_id
    from public."TBL_Resolutor_Solvi"
    where sharepoint_id is not null
    group by sharepoint_id
    having count(*) > 1
  ) then
    raise exception 'Cannot create unique index on TBL_Resolutor_Solvi.sharepoint_id because duplicate values already exist.';
  end if;
end $$;

create unique index if not exists tbl_resolutor_solvi_sharepoint_id_uidx
  on public."TBL_Resolutor_Solvi" (sharepoint_id)
  where sharepoint_id is not null;
