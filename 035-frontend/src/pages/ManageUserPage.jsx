import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataGrid } from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem } from "@mui/material";
import styles from "../styles/ManageUserPage.module.css";
import { allUserApi, modifyUserApi, deleteUserApi, addUserApi } from "../api/userApi";

const ManageUserPage = () => {
  const queryClient = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [inputText, setInputText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [newUser, setNewUser] = useState({
    username: "",
    kname: "",
    password: "",
    roles: "USER",
    email: "",
    address: "",
    use_yn: "Y",
  });

  const columns = [
    { field: "id", headerName: "ID", width: 60, headerAlign: "center", align: "center" },
    { field: "username", headerName: "아이디", width: 110, editable: true, headerAlign: "center", align: "center" },
    { field: "kname", headerName: "이름", width: 130, editable: true, headerAlign: "center", align: "center"  },
    { 
      field: "roles", 
      headerName: "권한", 
      width: 120, 
      editable: true, 
      type: "singleSelect", // 드롭다운 타입 설정
      valueOptions: ["ADMIN", "USER"], // 선택 옵션
      headerAlign: "center", 
      align: "center" 
    },    
    { field: "email", headerName: "이메일", width: 180, editable: true, headerAlign: "center", align: "center"  },
    { field: "address", headerName: "주소", flex: 1, editable: true, headerAlign: "center", align: "left"  },
    { 
      field: "use_yn", 
      headerName: "사용여부", 
      width: 80, 
      editable: true, 
      type: "singleSelect", // 드롭다운 타입 설정
      valueOptions: ["Y", "N"], // 선택 옵션
      headerAlign: "center",
      align: "center" 
    },        
    {
      field: "actions",
      headerName: "삭제",
      width: 70,
      headerAlign: "center",
      align: "center",
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <IconButton
          color="error"
          size="small"
          onClick={() => handleDelete(params.row)}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    },    
  ];


  /* --------------------------------------------------------------------------------
   조회
  -------------------------------------------------------------------------------- */
  const { data = [], isLoading, error, refetch, isFetching,} = useQuery(
    {    
      queryKey: ["alluser", searchText],
      queryFn: () => allUserApi({ keyword: searchText }),
      enabled: true,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: 0,
    }
  );


  /* --------------------------------------------------------------------------------
   수정
  -------------------------------------------------------------------------------- */
  const modifyUserMutation = useMutation({
    mutationFn: modifyUserApi,
    onSuccess: () => {
      // 수정 성공 후 사용자 목록 다시 가져오기
      queryClient.invalidateQueries({ queryKey: ["alluser"] });
    },
    onError: (error) => {
      alert("사용자 정보 수정 실패", error.message);
      console.log(error.response.status); // 예: 500
      console.log(error.response.data);   // 서버가 보낸 실제 에러 본문 (예: { message: "DB Error" })
      console.log(error.config.url);      // 에러가 발생한 API 주소 확인 
    },
  });  


  /* --------------------------------------------------------------------------------
   삭제
  -------------------------------------------------------------------------------- */
  const deleteUserMutation = useMutation({
    mutationFn: deleteUserApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alluser"] });
    },
    onError: (error) => {
      alert("사용자 삭제 실패", error.message);
      console.log(error.response.status); // 예: 500
      console.log(error.response.data);   // 서버가 보낸 실제 에러 본문 (예: { message: "DB Error" })
      console.log(error.config.url);      // 에러가 발생한 API 주소 확인       
    },
  });


  /* --------------------------------------------------------------------------------
   삭제 핸들러
  -------------------------------------------------------------------------------- */  
  const handleDelete = (row) => {
    const confirm = window.confirm(
      `사용자 "${row.username}"를 삭제하시겠습니까?`
    );

    if (!confirm) return;

    deleteUserMutation.mutate({
      id: row.id, // deleteUserApi에서 사용하는 키에 맞게 조정
    });
  };


  /* --------------------------------------------------------------------------------
  생성
  -------------------------------------------------------------------------------- */
  const addUserMutation = useMutation({
    mutationFn: addUserApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alluser"] });
      setOpenCreate(false);  // 사용자추가화면을 안보이게 처리
      setNewUser({
        username: "",
        kname: "",
        password: "",
        roles: "USER",
        email: "",
        address: "",
        use_yn: "Y",
      });
    },
    onError: (error) => {
      alert("사용자 생성 실패", error.message);
      console.log(error.response.status); // 예: 500
      console.log(error.response.data);   // 서버가 보낸 실제 에러 본문 (예: { message: "DB Error" })
      console.log(error.config.url);      // 에러가 발생한 API 주소 확인             
    },
  });  



  return (
    <Box sx={{ px: 2, pt: 0 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 className={styles.title} style={{ margin: 0 }}>사용자 관리</h2>

        {/* 버튼 영역 */}
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            size="small"
            sx={{ "& .MuiInputBase-root": {height: 42, width: 300} }}
            placeholder="아이디 / 이름 / 권한 / 이메일 / 주소 검색"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearchText(inputText);
              }
            }}
          />

          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              //setSearchText(inputText);
              refetch();
            }}
            disabled={isFetching}
          >
            새로고침
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={() => setOpenCreate(true)}
          >
            생성
          </Button>
        </Box>

      </Box>

      {/* Grid 영역 */}
      <Box sx={{ height: 550, mt: 2 }}>
        <DataGrid
          rows={data}
          columns={columns}
          showToolbar={true} 
          slotProps={{
            toolbar: {
              showQuickFilter: true,
            },
          }}
          loading={
            isLoading || 
            isFetching || 
            modifyUserMutation.isLoading ||
            deleteUserMutation.isLoading
          }
          pageSizeOptions={[5, 10, 20]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10, page: 0 },
            },
          }}
          disableRowSelectionOnClick
          processRowUpdate={(newRow, oldRow) => {
            modifyUserMutation.mutate({
              id: newRow.id,
              username: newRow.username,
              kname: newRow.kname,
              roles: newRow.roles,
              email: newRow.email,
              address: newRow.address,
              use_yn: newRow.use_yn,
            });

            // DataGrid에 수정된 값 반영
            return newRow;
          }}
          onProcessRowUpdateError={(error) => {
            console.error(error);
            alert("수정 중 오류가 발생했습니다.");
          }}
        />


        {/* 사용자 생성 레이어 영역 */}
        <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
          <DialogTitle>사용자 생성</DialogTitle>

          <DialogContent dividers>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="아이디"
                value={newUser.username}
                onChange={(e) =>
                  setNewUser({ ...newUser, username: e.target.value })
                }
                fullWidth
                required
              />

              <TextField
                label="이름"
                value={newUser.kname}
                onChange={(e) =>
                  setNewUser({ ...newUser, kname: e.target.value })
                }
                fullWidth
                required
              />

              <TextField
                label="암호"
                type="password"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
                fullWidth
                required
              />              

              <TextField
                label="권한"
                select
                value={newUser.roles}
                onChange={(e) =>
                  setNewUser({ ...newUser, roles: e.target.value })
                }
                fullWidth
              >
                <MenuItem value="ADMIN">ADMIN</MenuItem>
                <MenuItem value="USER">USER</MenuItem>
              </TextField>

              <TextField
                label="이메일"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                fullWidth
              />

              <TextField
                label="주소"
                value={newUser.address}
                onChange={(e) =>
                  setNewUser({ ...newUser, address: e.target.value })
                }
                fullWidth
              />

              <TextField
                label="사용여부"
                select
                value={newUser.use_yn}
                onChange={(e) =>
                  setNewUser({ ...newUser, use_yn: e.target.value })
                }
                fullWidth
              >
                <MenuItem value="Y">사용</MenuItem>
                <MenuItem value="N">미사용</MenuItem>
              </TextField>
            </Box>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setOpenCreate(false)}>취소</Button>
            <Button
              variant="contained"
              onClick={() => addUserMutation.mutate(newUser)}
              disabled={addUserMutation.isLoading}
            >
              생성
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
    </Box>
  );

};

export default ManageUserPage;
