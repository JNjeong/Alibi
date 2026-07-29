import useAuthStore from "../store/authStore"

const MainPage = () => {
    const user = useAuthStore((state) => state.user)

    return (
        <div>
            <h1>메인 페이지</h1>

            <p>아이디 : {user?.username}</p>
            <p>닉네임 : {user?.nickname}</p>
        </div>
    )
}

export default MainPage