port module App exposing (..)

import ColorPicker
import ColorDisplay
import IceServersProvider
import Html exposing (Html, div, img, a, text, br)
import Html.App
import Html.Attributes exposing (src, href, target)
import Random
import String
import Navigation
import Routing exposing (Route)


type alias AppModel =
    { colorPickerModel : ColorPicker.Model
    , session : Session
    , host : String
    , route : Routing.Route
    }


type alias Session =
    { isHost : Bool
    , sessionId : String
    , domain : String
    }


initialModel : AppModel
initialModel =
    { colorPickerModel = ColorPicker.initialModel
    , session = Session False "" ""
    , host = ""
    , route = Routing.NotFound
    }


getSessionIdFromRoute : Route -> Maybe String
getSessionIdFromRoute route =
    case route of
        Routing.SessionRoute _ sessionId ->
            Just sessionId

        _ ->
            Nothing


getHostFromRoute : Route -> String
getHostFromRoute route =
    case route of
        Routing.SessionRoute host _ ->
            host

        Routing.MainRoute host ->
            host

        _ ->
            ""


init : Result String Route -> ( AppModel, Cmd Msg )
init result =
    let
        route =
            Routing.routeFromResult result

        routeSessionId =
            getSessionIdFromRoute route

        host =
            getHostFromRoute route

        domain =
            host
                |> String.split ":"
                |> List.head
                |> Maybe.withDefault ""

        currentSession =
            case routeSessionId of
                Just sessionId ->
                    Session False sessionId host

                Nothing ->
                    Session True "" host

        sessionIdCmd =
            if currentSession.isHost then
                Random.generate GenerateSessionId (Random.int 1 10000)
            else
                sessionPort currentSession
    in
        ( { initialModel | session = currentSession, route = route }
        , Cmd.batch
            [ Cmd.map IceServersProviderMsg (IceServersProvider.getIceServers domain)
            , sessionIdCmd
            ]
        )


type Msg
    = ColorPickerMsg ColorPicker.Msg
    | IceServersProviderMsg IceServersProvider.Msg
    | ChangeColorFromPort ColorPicker.Model
    | GenerateSessionId Int


getSessionQrCodeUrl : String -> String -> String
getSessionQrCodeUrl host sessionId =
    "http://chart.apis.google.com/chart?chs=200x200&cht=qr&chld=|1&chl="
        ++ "https%3A%2F%2F"
        ++ host
        ++ "%2F"
        ++ sessionId


getSessionConnectUrl : String -> String -> String
getSessionConnectUrl host sessionId =
    "http://" ++ host ++ "/" ++ sessionId


view : AppModel -> Html Msg
view model =
    case model.session.isHost of
        False ->
            div []
                [ Html.App.map ColorPickerMsg (ColorDisplay.view model.colorPickerModel)
                ]

        True ->
            div []
                [ Html.App.map ColorPickerMsg (ColorPicker.view model.colorPickerModel)
                , img [ src (getSessionQrCodeUrl model.session.domain model.session.sessionId) ] []
                , br [] []
                , a [ href (getSessionConnectUrl model.session.domain model.session.sessionId), target "_blank" ]
                    [ text (getSessionConnectUrl model.session.domain model.session.sessionId)
                    ]
                ]


update : Msg -> AppModel -> ( AppModel, Cmd Msg )
update message model =
    case message of
        GenerateSessionId newSessionId ->
            let
                previousSession =
                    model.session

                newSession =
                    { previousSession | sessionId = toString newSessionId }
            in
                ( { model | session = newSession }, sessionPort newSession )

        ChangeColorFromPort newColor ->
            update (ColorPickerMsg (ColorPicker.ChangeColor newColor)) model

        ColorPickerMsg subMsg ->
            case subMsg of
                ColorPicker.ChangedColor newColor ->
                    ( model, changedColor newColor )

                _ ->
                    let
                        ( updatedColorPickerModel, colorPickerCmd ) =
                            ColorPicker.update subMsg model.colorPickerModel
                    in
                        ( { model | colorPickerModel = updatedColorPickerModel }, Cmd.map ColorPickerMsg colorPickerCmd )

        IceServersProviderMsg subMsg ->
            case subMsg of
                IceServersProvider.FetchSucceed iceServers ->
                    ( model, iceServersPort iceServers )

                _ ->
                    ( model, Cmd.none )


urlUpdate : Result String Route -> AppModel -> ( AppModel, Cmd Msg )
urlUpdate result model =
    let
        currentRoute =
            Routing.routeFromResult result
    in
        ( model, Cmd.none )


port changeColor : (ColorPicker.Model -> msg) -> Sub msg


port changedColor : ColorPicker.Model -> Cmd msg


port sessionPort : Session -> Cmd msg


port iceServersPort : List IceServersProvider.IceServer -> Cmd msg


subscriptions : AppModel -> Sub Msg
subscriptions model =
    changeColor ChangeColorFromPort


main : Program Never
main =
    Navigation.program Routing.parser
        { init = init
        , view = view
        , update = update
        , urlUpdate = urlUpdate
        , subscriptions = subscriptions
        }
